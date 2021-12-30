export default class ICVQ{
  static Options(DOMElement){
    return DOMElement.querySelector(".ComboBox > span:first-child").innerHTML;
  }
  static Range(DOMElement){
    return DOMElement.querySelector(":scope > span + span > form > input + input").value; //Return value of text input, NOT slider!
  }
  static Text(DOMElement){
    return DOMElement.querySelector(":scope > span + span > input").value;
  }
  static Switch(DOMElement){
    return DOMElement.querySelector(":scope > span + span > label > input").checked;
  }
  static Key(DOMElement){
    return ICVQ.Text(DOMElement);
  }
}
