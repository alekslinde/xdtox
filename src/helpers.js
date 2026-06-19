// Pure helper functions extracted from code.js for testability.

function isClipPathGroup(node) {
  if (node.type !== "GROUP") return false;
  var n = node.name.toLowerCase().trim();
  return n === "clip path group" || n === "clip-path group";
}

function isFrameNameGroup(node, frameName) {
  if (node.type !== "GROUP") return false;
  return node.name.toLowerCase().trim() === frameName.toLowerCase().trim();
}

function isClipMaskNode(node, frameName) {
  var name = node.name.toLowerCase().trim();
  if (!name.startsWith("clip-")) return false;
  var sanitised = frameName.toLowerCase().trim().replace(/\s+/g, "_");
  var candidate = name.slice(5);
  return candidate === sanitised || candidate === frameName.toLowerCase().trim().replace(/\s+/g, "-");
}

function looksLikeXDFrame(frame) {
  if (frame.type !== "FRAME" && frame.type !== "COMPONENT") return false;
  if (frame.children.length !== 1) return false;

  var clipGroup = frame.children[0];
  if (!isClipPathGroup(clipGroup)) return false;

  var hasInnerGroup = false;
  for (var i = 0; i < clipGroup.children.length; i++) {
    if (isFrameNameGroup(clipGroup.children[i], frame.name)) {
      hasInnerGroup = true;
      break;
    }
  }

  return hasInnerGroup;
}

function isBackgroundVector(node, frame) {
  if (node.type !== "VECTOR" && node.type !== "RECTANGLE") return false;
  if (!node.fills || node.fills.length === 0) return false;

  var nb = node.absoluteBoundingBox;
  var fb = frame.absoluteBoundingBox;
  if (!nb || !fb) return false;

  var tolX = fb.width  * 0.02 + 2;
  var tolY = fb.height * 0.02 + 2;
  var coversWidth  = Math.abs(nb.width  - fb.width)  <= tolX;
  var coversHeight = Math.abs(nb.height - fb.height) <= tolY;
  var alignedX = Math.abs(nb.x - fb.x) <= tolX;
  var alignedY = Math.abs(nb.y - fb.y) <= tolY;

  return coversWidth && coversHeight && alignedX && alignedY;
}

// Returns an array of reason strings for a frame that passes looksLikeXDFrame
// but has structural anomalies that warrant a manual check after stripping.
// Caller must ensure looksLikeXDFrame(frame) is true before calling.
function reviewReasonsForXDFrame(frame) {
  var reasons = [];
  var clipGroup = frame.children[0];
  var innerGroup = null;
  var hasClipMask = false;
  var unexpectedCount = 0;

  for (var i = 0; i < clipGroup.children.length; i++) {
    var child = clipGroup.children[i];
    if (isFrameNameGroup(child, frame.name)) {
      innerGroup = child;
    } else if (isClipMaskNode(child, frame.name)) {
      hasClipMask = true;
    } else {
      unexpectedCount++;
    }
  }

  if (!hasClipMask) reasons.push("clip mask missing");
  if (unexpectedCount > 0) reasons.push("unexpected nodes in clip group");

  if (innerGroup) {
    for (var j = 0; j < innerGroup.children.length; j++) {
      if (!innerGroup.children[j].absoluteBoundingBox) {
        reasons.push("node bounds unavailable");
        break;
      }
    }
  }

  return reasons;
}

module.exports = { isClipPathGroup, isFrameNameGroup, isClipMaskNode, looksLikeXDFrame, isBackgroundVector, reviewReasonsForXDFrame };
