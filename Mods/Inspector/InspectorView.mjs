export default class InspectorView{
  constructor(IDocument, Element){
    this.IDocument = IDocument;

    this.IDocument.documentElement.style.overflow = "hidden";

    this.Element = Element;
  }
};