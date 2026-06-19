// Copyright (c) 2026 Aleks Linde – alekslinde.com
// SPDX-License-Identifier: MIT
//
// XDtox – strips Adobe XD SVG import artifacts from Figma frames.
//
// Exact XD structure observed in Figma after SVG import:
//
//   Frame  "Frame name"
//     └─ Group  "Clip path group"          ← outer wrapper, always this name
//          ├─ Group  "Frame name"          ← inner group named after the frame
//          │    └─ [actual content nodes]
//          └─ Node   "clip-Frame-name"     ← clip mask node, name: "clip-{sanitised frame name}"
//
// Steps to clean:
//   1. Detect the "Clip path group" child of the frame
//   2. Inside it, find the inner group matching the frame name → extract its children into the frame
//   3. Delete the clip-{name} mask node
//   4. Delete the now-empty "Clip path group"

const {
  isClipPathGroup,
  isFrameNameGroup,
  isClipMaskNode,
  looksLikeXDFrame,
  isBackgroundVector,
  reviewReasonsForXDFrame,
} = require("./helpers");

figma.showUI(__html__, { width: 380, height: 560, themeColors: true });

// ─── plugin-only logic ────────────────────────────────────────────────────────

function promoteBackgroundFill(frame) {
  if (frame.children.length === 0) return;
  var candidate = frame.children[0];

  if (!isBackgroundVector(candidate, frame)) return;

  var fills = candidate.fills;
  if (fills && fills.length > 0) {
    var newFills = [];
    for (var i = 0; i < fills.length; i++) {
      newFills.push(fills[i]);
    }
    frame.fills = newFills;
  }

  candidate.remove();
}

function stripXDWrappers(frame) {
  if (!looksLikeXDFrame(frame)) return { skipped: true };

  var clipGroup = frame.children[0];
  var innerGroup = null;
  var clipMask = null;

  for (var i = 0; i < clipGroup.children.length; i++) {
    var child = clipGroup.children[i];
    if (isFrameNameGroup(child, frame.name)) {
      innerGroup = child;
    } else if (isClipMaskNode(child, frame.name)) {
      clipMask = child;
    }
  }

  if (!innerGroup) return { skipped: true, reason: "no inner group" };

  var contentNodes = [];
  for (var j = 0; j < innerGroup.children.length; j++) {
    contentNodes.push(innerGroup.children[j]);
  }

  if (contentNodes.length === 0) return { skipped: true, reason: "empty" };

  var reasons = reviewReasonsForXDFrame(frame);
  var frameAbs = frame.absoluteBoundingBox;

  for (var k = 0; k < contentNodes.length; k++) {
    var node = contentNodes[k];
    var nodeBounds = node.absoluteBoundingBox;
    var absX = nodeBounds ? nodeBounds.x : 0;
    var absY = nodeBounds ? nodeBounds.y : 0;

    frame.appendChild(node);

    if (frameAbs) {
      node.x = absX - frameAbs.x;
      node.y = absY - frameAbs.y;
    }
  }

  if (clipMask) {
    clipMask.remove();
  }

  clipGroup.remove();
  promoteBackgroundFill(frame);

  if (reasons.length > 0) {
    return { stripped: true, needsReview: true, reason: reasons.join("; ") };
  }

  return { stripped: true };
}

// ─── message handler ──────────────────────────────────────────────────────────

figma.ui.onmessage = async function(msg) {
  if (msg.type === "scan") {
    scanForFrames(msg.scope);
  }

  if (msg.type === "locate") {
    var node = await figma.getNodeByIdAsync(msg.id);
    if (node) {
      // Walk up to the node's owning page; it may differ from the
      // current page when scanning the whole file.
      var page = node;
      while (page && page.type !== "PAGE") {
        page = page.parent;
      }
      if (page && page !== figma.currentPage) {
        figma.currentPage = page;
      }
      figma.currentPage.selection = [node];
      figma.viewport.scrollAndZoomIntoView([node]);
    }
  }

  if (msg.type === "resize") {
    figma.ui.resize(msg.width, msg.height);
  }

  if (msg.type === "strip") {
    stripFramesById(msg.ids || []);
  }
};

function delay(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

// Walk the candidate frames one at a time, streaming each name to the UI so the
// user can watch what the plugin is looking through, then return the matches.
function scanForFrames(scope) {
  return (async function() {
    var selection = figma.currentPage.selection;
    var useFile = scope === "file";
    var root = useFile ? figma.root : figma.currentPage;

    // Whole-file search requires every page to be loaded first when the
    // plugin runs with documentAccess: "dynamic-page".
    if (useFile) {
      await figma.loadAllPagesAsync();
    }

    var candidates;
    var mode;
    if (selection.length === 0) {
      candidates = root.findAll(function(n) {
        return n.type === "FRAME" || n.type === "COMPONENT";
      });
      mode = useFile ? "file" : "page";
    } else {
      candidates = selection.filter(function(n) {
        return n.type === "FRAME" || n.type === "COMPONENT";
      });
      mode = "selection";
    }

    var total = candidates.length;
    figma.ui.postMessage({ type: "scan-start", total: total });

    // Bound the whole animation to ~2.2s so large files don't crawl, while
    // still giving small files a visible per-frame pace.
    var per = total > 0 ? Math.max(4, Math.min(35, Math.round(2200 / total))) : 0;

    var affected = [];
    for (var i = 0; i < total; i++) {
      var f = candidates[i];
      var hit = looksLikeXDFrame(f);
      if (hit) affected.push(f);

      figma.ui.postMessage({
        type: "scan-progress",
        name: f.name,
        index: i + 1,
        total: total,
        found: affected.length,
        hit: hit,
      });
      await delay(per);
    }

    figma.ui.postMessage({
      type: "scan-result",
      count: affected.length,
      frames: affected.map(function(f) { return { id: f.id, name: f.name }; }),
      mode: mode,
      selectionCount: selection.length,
    });
  })();
}

// Strip the exact frames the UI listed, one at a time, reporting status per
// frame so the panel can show live in-progress / done / error indicators.
function stripFramesById(ids) {
  return (async function() {
    var stripped = 0;
    var skipped = 0;
    var errored = 0;
    var needsReview = 0;

    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      figma.ui.postMessage({ type: "strip-progress", id: id, status: "in-progress" });
      // Yield so the UI can paint the in-progress state before the work runs.
      await delay(90);

      try {
        var node = await figma.getNodeByIdAsync(id);
        if (!node || (node.type !== "FRAME" && node.type !== "COMPONENT")) {
          skipped++;
          figma.ui.postMessage({ type: "strip-progress", id: id, status: "skipped", reason: "not found" });
          continue;
        }

        var result = stripXDWrappers(node);
        if (result.stripped) {
          if (result.needsReview) {
            needsReview++;
            figma.ui.postMessage({ type: "strip-progress", id: id, status: "review", reason: result.reason });
          } else {
            stripped++;
            figma.ui.postMessage({ type: "strip-progress", id: id, status: "done" });
          }
        } else {
          skipped++;
          figma.ui.postMessage({ type: "strip-progress", id: id, status: "skipped", reason: result.reason || "no XD wrapper" });
        }
      } catch (e) {
        errored++;
        figma.ui.postMessage({
          type: "strip-progress",
          id: id,
          status: "error",
          reason: String((e && e.message) || e),
        });
      }

      await delay(40);
    }

    figma.ui.postMessage({ type: "done", stripped: stripped, skipped: skipped, errored: errored, needsReview: needsReview });
    var totalCleaned = stripped + needsReview;
    figma.notify(
      totalCleaned > 0
        ? "✶ XDtox: cleaned " + totalCleaned + " frame" + (totalCleaned !== 1 ? "s" : "") +
          (needsReview > 0 ? ", " + needsReview + " need" + (needsReview !== 1 ? "" : "s") + " review" : "") +
          (skipped > 0 ? ", skipped " + skipped : "") +
          (errored > 0 ? ", " + errored + " failed" : "")
        : (errored > 0
            ? "XDtox: " + errored + " frame" + (errored !== 1 ? "s" : "") + " failed."
            : "No XD wrapper frames found.")
    );
  })();
}

