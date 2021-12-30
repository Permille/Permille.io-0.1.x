export default class ICCD{
  static Options(DOMElement, Listener){
    //new MutationObserver(Listener).observe(DOMElement.querySelector(".ComboBox > span:first-child"), {"characterData": true, "childList": true, "attributes": true});
    DOMElement.querySelector(".ComboBox").addEventListener("click", Listener);
  }
  static Range(DOMElement, Listener){
    DOMElement.querySelector(":scope > span + span > form > input + input").addEventListener("focusout", Listener); //Text
    DOMElement.querySelector(":scope > span + span > form > input + input").addEventListener("keydown", function(Event){
      if(Event.code === "Enter") Listener();
    });
    DOMElement.querySelector(":scope > span + span > form > input:first-child").addEventListener("input", Listener);
  }
  static Text(DOMElement, Listener){
    DOMElement.querySelector(":scope > span + span > input").addEventListener("focusout", Listener); //Text
    DOMElement.querySelector(":scope > span + span > input").addEventListener("keydown", function(Event){
      if(Event.code === "Enter") Listener();
    });
  }
  static Switch(DOMElement, Listener){
    DOMElement.querySelector(":scope > span + span > label > input").addEventListener("input", Listener);
  }
  static Key(DOMElement, Listener){
    DOMElement.querySelector(":scope > span + span > input").addEventListener("focusout", Listener);
  }
}
