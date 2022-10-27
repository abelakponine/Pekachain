import Block from "./Block";

export default class Blocks {

    private chainType: string = "List_Of_Transaction_Blocks";
    private blocks: Block[] = [];

    getChainType(){
        return this.chainType;
    }
    getBlocks(): Block[] {
        return this.blocks;
    }
    protected addNewBlock(block: Block): boolean {
        if (this.blocks.push(block)) return true;
        else return false;
    }
}