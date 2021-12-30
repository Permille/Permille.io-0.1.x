import Block from "./Block.mjs";
export default class BlockRegistry{
  static MAX_BLOCK_IDS = 65536;
  constructor(){
    this.BlockIDMapping = {};
    this.BlockIdentifierMapping = {};
    this.RegisterPrimaryIDs();
  }
  static Initialise(BlockIDMapping, BlockIdentifierMapping){
    let This = Object.create(this.prototype);
    This.BlockIDMapping = BlockIDMapping;
    This.BlockIdentifierMapping = BlockIdentifierMapping;
    return This;
  }
  RegisterPrimaryIDs(){
    this.RegisterBlock(new Block("primary:air", {"Solid": false, "Invisible": true, "Transparent": true, "Precedence": -32}, 0), 0);
    this.RegisterBlock(new Block("primary:not_loaded", {"Solid": true, "Invisible": true, "Transparent": true}, 49148), 49148);
    this.RegisterBlock(new Block("primary:placeholder", {"Solid": true, "Invisible": false, "Transparent": false}, 49149), 49149);
    this.RegisterBlock(new Block("primary:temp", {"Solid": true, "Invisible": false, "Transparent": false}, 49150), 49150);
    this.RegisterBlock(new Block("primary:error", {"Solid": true, "Invisible": false, "Transparent": false, "Precedence": Infinity}, 49151), 49151);
    this.RegisterBlock(new Block("primary:custom", {"Solid": true, "Invisible": false, "Transparent": false, "Precedence": 1024}, 65535), 65535);

    this.RegisterBlock(new Block("generic:solid", {"Solid": true, "Invisible": false, "Transparent": false}, 61440), 61440);
    this.RegisterBlock(new Block("generic:gas", {"Solid": false, "Invisible": true, "Transparent": true}, 61441), 61441);
    this.RegisterBlock(new Block("generic:fluid", {"Solid": false, "Invisible": false, "Transparent": true}, 61442), 61442);
  }
  RegisterBlock(Block, ID){
    if(ID !== undefined){
      if(ID < 0 || ID >= BlockRegistry.MAX_BLOCK_IDS) throw new Error("Invalid Block ID.");
      if(this.BlockIDMapping[ID] !== undefined) throw new Error("The Block ID " + ID + " has already been mapped to a block (" + this.GetBlockByID(ID).Identifier + "). Try not specifying the ID to ensure that the block is given a unique Block ID.");
    }
    else ID = this.FindSmallestID();
    this.BlockIDMapping[ID] = Block;
    this.BlockIdentifierMapping[Block.Identifier] = Block;
    Block.ID = ID;
  }
  GetBlockByID(ID){
    return this.BlockIDMapping[ID] ?? this.BlockIDMapping[49151];
  }
  GetBlockByIdentifier(Identifier){
    return this.BlockIdentifierMapping[Identifier] ?? this.BlockIDMapping[49151];
  }
  FindSmallestID(){
    for(let i = 0; i < BlockRegistry.MAX_BLOCK_IDS; i++){
      if(this.BlockIDMapping[i] === undefined) return i;
    }
  }
}
