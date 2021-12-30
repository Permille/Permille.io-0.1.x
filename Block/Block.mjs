export default class Block{
  constructor(Identifier, Properties, ID = -1){ //The Identifier is a string like "default:air", not its ID which would be 0.
    this.Identifier = Identifier;
    this.Properties = Properties;
    this.ID = ID;
  }
}
