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

module.exports = { isClipPathGroup, isFrameNameGroup, isClipMaskNode, looksLikeXDFrame, isBackgroundVector };
