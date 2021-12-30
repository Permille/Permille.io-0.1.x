import Utilities from "../../Libraries/Utilities/0.7.13.8/Utilities.mjs";
export default class ICC{
  static Options_Default = {
    "Items": [],
    "Default": 0
  }
  static Options(DOMElement, Config = {}){
    Config = Utilities.MergeObjects(Config, ICC.Options_Default);
    const ItemsContainer = DOMElement.querySelector(".ComboBox > span + span + div");
    for(let Item of Config.Items){
      const Element = document.createElement("div");
      Element.dataset.exp = Item;
      ItemsContainer.append(Element);
    }
    DOMElement.querySelector(".ComboBox > span:first-child").dataset.exp = Config.Items[Config.Default] ?? "";
  }

  static Range_Default = {
    "Weighting": "Linear",
    "Min": 0,
    "Max": 20,
    "Default": 10,
    "Step": 1
  }
  static Range(DOMElement, Config = {}){
    Config = Utilities.MergeObjects(Config, ICC.Range_Default);
    const Slider = DOMElement.querySelector(":scope > span + span > form > input:first-child");
    const Text = DOMElement.querySelector(":scope > span + span > form > input + input");
    Slider.min = Config.Min;
    Slider.max = Config.Max;
    Slider.step = Config.Step;
    Slider.value = Config.Default;
    Text.step = "any";
    Text.value = Config.Default;
    Text.addEventListener("keydown", function(Event){
      if(Event.code === "Enter") Event.preventDefault(); //Prevents weird iframe refreshing
    });
    //TODO: Implement weightings. Linear, Logarithmic, Exponential, etc.
  }

  static Text_Default = {
    "Default": "",
    "DataType": "text"
  }
  static Text(DOMElement, Config = {}){
    Config = Utilities.MergeObjects(Config, ICC.Text_Default);
    DOMElement.querySelector(":scope > span + span > input").type = Config.DataType;
    if(Config.DataType === "number") DOMElement.querySelector(":scope > span + span > input").step = "any";
    DOMElement.querySelector(":scope > span + span > input").addEventListener("keydown", function(Event){
      if(Event.code === "Enter") Event.preventDefault(); //Prevents weird iframe refreshing
    });
    DOMElement.querySelector(":scope > span + span > input").value = Config.Default;
  }

  static Switch_Default = {
    "Default": false
  }
  static Switch(DOMElement, Config = {}){
    Config = Utilities.MergeObjects(Config, ICC.Switch_Default);
    DOMElement.querySelector(":scope > span + span > label > input").checked = Config.Default;
  }

  static Key_Default = {
    "Default": ""
  }
  static Key(DOMElement, Config = {}){
    Config = Utilities.MergeObjects(Config, ICC.Key_Default);
    DOMElement.querySelector(":scope > span + span > input").value = Config.Default;
  }

  static Button_Default = {
    "TextExp": undefined, //Define this for translatable text.
    "Text": undefined //Define this for a set text.
  }
  static Button(DOMElement, Config = {}){
    Config = Utilities.MergeObjects(Config, ICC.Button_Default);
    if(Config.TextExp) DOMElement.querySelector(":scope > span + span > div").dataset.exp = Config.TextExp;
    if(Config.Text) DOMElement.querySelector(":scope > span + span > div").innerHTML = Config.Text;
  }

  static CenteredButton_Default = {
    "TextExp": undefined,
    "Text": undefined
  }
  static CenteredButton(DOMElement, Config = {}){
    Config = Utilities.MergeObjects(Config, ICC.CenteredButton_Default);
    if(Config.TextExp) DOMElement.querySelector(":scope > div").dataset.exp = Config.TextExp;
    if(Config.Text) DOMElement.querySelector(":scope > div").innerHTML = Config.Text;
  }
}
