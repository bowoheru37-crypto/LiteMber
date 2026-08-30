/**
 * AssemblyEngine.ts
 * Virtual RISC Bytecode VM for ultra-fast low-level entity logic on Unisoc T606.
 */

export interface AssemblyInstruction {
  opcode: string;
  arg1?: string;
  arg2?: string;
}

export class AssemblyVM {
  public registers: Int32Array = new Int32Array(8); // R0 - R7
  public memory: Uint8Array = new Uint8Array(512);
  public stack: Int32Array = new Int32Array(32);
  public pc: number = 0;
  public sp: number = 0;
  public zeroFlag: boolean = false;
  public isHalted: boolean = false;

  private instructions: AssemblyInstruction[] = [];
  private labelMap: Map<string, number> = new Map();

  public assemble(asmSource: string): void {
    this.instructions = [];
    this.labelMap.clear();
    const lines = asmSource.split('\n');
    let idx = 0;
    const cleanLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim().replace(/;.*$/, '');
      if (!trimmed) continue;
      if (trimmed.endsWith(':')) {
        this.labelMap.set(trimmed.slice(0, -1), idx);
      } else {
        cleanLines.push(trimmed);
        idx++;
      }
    }

    for (const line of cleanLines) {
      const parts = line.split(/[\s,]+/);
      this.instructions.push({ opcode: parts[0].toUpperCase(), arg1: parts[1], arg2: parts[2] });
    }
    this.reset();
  }

  public reset(): void {
    this.registers.fill(0);
    this.memory.fill(0);
    this.stack.fill(0);
    this.pc = 0;
    this.sp = 0;
    this.zeroFlag = false;
    this.isHalted = false;
  }

  private getReg(arg?: string): number {
    if (!arg) return 0;
    if (arg.length === 2 && (arg[0] === 'R' || arg[0] === 'r')) {
      const idx = arg.charCodeAt(1) - 48;
      if (idx >= 0 && idx < 8) return idx;
    }
    return 0;
  }

  private getVal(arg?: string): number {
    if (!arg) return 0;
    if (arg.length === 2 && (arg[0] === 'R' || arg[0] === 'r')) {
      const idx = arg.charCodeAt(1) - 48;
      if (idx >= 0 && idx < 8) return this.registers[idx];
    }
    return parseInt(arg, 10) || 0;
  }

  public step(): boolean {
    if (this.isHalted || this.pc < 0 || this.pc >= this.instructions.length) {
      this.isHalted = true;
      return false;
    }

    const inst = this.instructions[this.pc++];
    switch (inst.opcode) {
      case 'MOV':
        this.registers[this.getReg(inst.arg1)] = this.getVal(inst.arg2);
        break;
      case 'ADD':
        this.registers[this.getReg(inst.arg1)] += this.getVal(inst.arg2);
        this.zeroFlag = this.registers[this.getReg(inst.arg1)] === 0;
        break;
      case 'SUB':
        this.registers[this.getReg(inst.arg1)] -= this.getVal(inst.arg2);
        this.zeroFlag = this.registers[this.getReg(inst.arg1)] === 0;
        break;
      case 'CMP':
        this.zeroFlag = (this.getVal(inst.arg1) - this.getVal(inst.arg2)) === 0;
        break;
      case 'JMP':
        if (inst.arg1 && this.labelMap.has(inst.arg1)) this.pc = this.labelMap.get(inst.arg1)!;
        break;
      case 'JZ':
        if (this.zeroFlag && inst.arg1 && this.labelMap.has(inst.arg1)) this.pc = this.labelMap.get(inst.arg1)!;
        break;
      case 'JNZ':
        if (!this.zeroFlag && inst.arg1 && this.labelMap.has(inst.arg1)) this.pc = this.labelMap.get(inst.arg1)!;
        break;
      case 'HALT':
        this.isHalted = true;
        break;
    }
    return true;
  }

  public run(maxSteps = 500): void {
    let steps = 0;
    while (!this.isHalted && steps < maxSteps) {
      if (!this.step()) break;
      steps++;
    }
  }

  public getDisassembly(): string {
    return this.instructions.map((i, idx) => `${idx}: ${i.opcode} ${i.arg1 || ''} ${i.arg2 || ''}`.trim()).join('\n');
  }
}
