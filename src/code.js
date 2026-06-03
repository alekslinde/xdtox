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

  return { stripped: true };
}

// ─── message handler ──────────────────────────────────────────────────────────

figma.ui.onmessage = function(msg) {
  if (msg.type === "scan") {
    var selection = figma.currentPage.selection;
    var useFile = msg.scope === "file";
    var root = useFile ? figma.root : figma.currentPage;

    if (selection.length === 0) {
      var allFrames = root.findAll(function(n) {
        return n.type === "FRAME" || n.type === "COMPONENT";
      });
      var affected = allFrames.filter(function(f) { return looksLikeXDFrame(f); });
      figma.ui.postMessage({
        type: "scan-result",
        count: affected.length,
        frames: affected.map(function(f) { return { id: f.id, name: f.name }; }),
        mode: useFile ? "file" : "page",
      });
    } else {
      var affected = selection.filter(function(n) {
        return (n.type === "FRAME" || n.type === "COMPONENT") && looksLikeXDFrame(n);
      });
      figma.ui.postMessage({
        type: "scan-result",
        count: affected.length,
        frames: affected.map(function(f) { return { id: f.id, name: f.name }; }),
        mode: "selection",
        selectionCount: selection.length,
      });
    }
  }

  if (msg.type === "locate") {
    var node = figma.getNodeById(msg.id);
    if (node) {
      figma.currentPage.selection = [node];
      figma.viewport.scrollAndZoomIntoView([node]);
    }
  }

  if (msg.type === "resize") {
    figma.ui.resize(msg.width, msg.height);
  }

  if (msg.type === "strip") {
    var useFile = msg.scope === "file";
    var root = useFile ? figma.root : figma.currentPage;
    var targets;

    if (msg.useSelection) {
      targets = figma.currentPage.selection.filter(function(n) {
        return n.type === "FRAME" || n.type === "COMPONENT";
      });
    } else {
      targets = root.findAll(function(n) {
        return n.type === "FRAME" || n.type === "COMPONENT";
      });
    }

    var stripped = 0;
    var skipped = 0;

    for (var i = 0; i < targets.length; i++) {
      var result = stripXDWrappers(targets[i]);
      if (result.stripped) stripped++;
      else skipped++;
    }

    figma.ui.postMessage({ type: "done", stripped: stripped, skipped: skipped });
    figma.notify(
      stripped > 0
        ? "✶ XDtox: cleaned " + stripped + " frame" + (stripped !== 1 ? "s" : "") +
          (skipped > 0 ? ", skipped " + skipped : "")
        : "No XD wrapper frames found."
    );
  }
};
