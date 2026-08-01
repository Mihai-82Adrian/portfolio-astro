// Shared, independently-testable XML comment stripping for build-time codegen scripts.
export function stripXmlComments(xml) {
  // Loop to a fixpoint: a single pass can leave a reconstructed "<!--"/"-->" behind
  // when comments are nested or overlapping (e.g. "<!--<!---->-->").
  let prev;
  do {
    prev = xml;
    xml = xml.replace(/<!--[\s\S]*?-->/g, '');
  } while (xml !== prev);
  return xml;
}
