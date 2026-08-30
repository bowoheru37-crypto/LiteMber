/**
 * DialogueEngine.ts
 * Comprehensive Interactive Dialogue, Monologue, Cutscene & Narrative Engine
 * Supports typewriter animation, NPC portraits, mood expressions, floating thought bubbles,
 * dynamic variable tag replacement ({player_name}, {score}, {gold}), choice conditions,
 * haptic feedback, and canvas HUD rendering.
 */

import {
  DialogueTree,
  DialogueNode,
  DialogueOption,
  DialogueMode,
  DialogueMood,
  DialogueCondition,
  DialogueVariableChange,
  ActionType,
} from '../types/engine';
import { soundEngine } from './AudioEngine';
import { AndroidEngine } from './AndroidEngine';
import { unifiedGameContext } from './UnifiedGameContext';

export class DialogueEngine {
  private activeTree: DialogueTree | null = null;
  private currentNode: DialogueNode | null = null;
  private active: boolean = false;

  // Global Story Variables Store
  private variables: Record<string, string | number | boolean> = {
    player_name: 'Satria Hero',
    score: 0,
    gold: 100,
    health: 100,
    has_key: false,
    reputation: 10,
    quest_accepted: false,
  };

  // Typewriter State
  private typedCharCount: number = 0;
  private typewriterTimerMs: number = 0;
  private typewriterFps: number = 28; // chars per sec
  private isTypingComplete: boolean = false;
  private autoAdvanceTimerMs: number = 0;

  // Active Processed Text (With dynamic variable substitutions)
  private processedText: string = '';

  // Callback on Option Action Triggered
  public onExecuteAction?: (action: ActionType, param?: string) => void;

  /**
   * Sets or Updates a Story Variable
   */
  public setVariable(name: string, value: string | number | boolean): void {
    this.variables[name] = value;
  }

  public getVariable(name: string): string | number | boolean | undefined {
    return this.variables[name];
  }

  public getAllVariables(): Record<string, string | number | boolean> {
    return { ...this.variables };
  }

  /**
   * Replaces dynamic tags in dialogue text e.g. {player_name}, {score}, {gold}
   */
  public substituteVariables(rawText: string): string {
    if (!rawText) return '';
    return rawText.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, varName) => {
      const val = this.variables[varName];
      if (val !== undefined) return String(val);
      const ctxVal = unifiedGameContext.getVariableValue(varName);
      if (ctxVal !== undefined) return String(ctxVal);
      return `{${varName}}`;
    });
  }

  /**
   * Evaluates a condition against current variables store
   */
  public evaluateCondition(condition?: DialogueCondition): boolean {
    if (!condition || !condition.varName) return true;
    const currentVal = this.variables[condition.varName] ?? unifiedGameContext.getVariableValue(condition.varName);
    const targetVal = condition.value;

    switch (condition.operator) {
      case '==':
        return currentVal == targetVal;
      case '!=':
        return currentVal != targetVal;
      case '>=':
        return Number(currentVal) >= Number(targetVal);
      case '<=':
        return Number(currentVal) <= Number(targetVal);
      case 'contains':
        return String(currentVal).toLowerCase().includes(String(targetVal).toLowerCase());
      default:
        return true;
    }
  }

  /**
   * Applies variable mutations defined in a node or option
   */
  public applyVariableChanges(changes?: DialogueVariableChange[]): void {
    if (!changes || changes.length === 0) return;

    for (const change of changes) {
      const { varName, operation, value } = change;
      const currentVal = this.variables[varName];

      if (operation === 'set') {
        this.variables[varName] = value;
      } else if (operation === 'add') {
        const curNum = Number(currentVal) || 0;
        const addNum = Number(value) || 0;
        this.variables[varName] = curNum + addNum;
      } else if (operation === 'toggle') {
        this.variables[varName] = !Boolean(currentVal);
      }
    }
  }

  /**
   * Starts a dialogue or monologue sequence from a dialogue tree
   */
  public startDialogue(tree: DialogueTree, startNodeId?: string): void {
    if (!tree || !tree.nodes) return;

    this.activeTree = tree;
    if (tree.variables) {
      this.variables = { ...this.variables, ...tree.variables };
    }

    const nodeId = startNodeId || tree.initialNodeId;
    this.currentNode = tree.nodes[nodeId] || Object.values(tree.nodes)[0] || null;

    if (this.currentNode) {
      // Evaluate Node Condition if present
      if (!this.evaluateCondition(this.currentNode.condition)) {
        // If node condition fails, jump to next or close
        if (this.currentNode.nextDialogueId && tree.nodes[this.currentNode.nextDialogueId]) {
          this.startDialogue(tree, this.currentNode.nextDialogueId);
          return;
        }
      }

      this.active = true;
      this.applyVariableChanges(this.currentNode.variableChanges);
      this.processedText = this.substituteVariables(this.currentNode.text);
      this.resetTypewriter();
      AndroidEngine.triggerHaptic(15);
      soundEngine.play(this.currentNode.beepSound || 'coin');
    }
  }

  private resetTypewriter(): void {
    this.typedCharCount = 0;
    this.typewriterTimerMs = 0;
    this.autoAdvanceTimerMs = 0;
    this.isTypingComplete = false;
    this.typewriterFps = this.currentNode?.typewriterFps || 28;
  }

  /**
   * Updates typewriter animation and auto-advance timers
   */
  public update(dtMs: number): void {
    if (!this.active || !this.currentNode) return;

    if (!this.isTypingComplete) {
      this.typewriterTimerMs += dtMs;
      const charIntervalMs = 1000 / this.typewriterFps;

      if (this.typewriterTimerMs >= charIntervalMs) {
        this.typewriterTimerMs -= charIntervalMs;
        this.typedCharCount++;

        // Play typing beep every 3 characters
        if (this.typedCharCount % 3 === 0) {
          const beepKey = this.currentNode.beepSound || 'synth';
          soundEngine.play(beepKey);
        }

        if (this.typedCharCount >= this.processedText.length) {
          this.typedCharCount = this.processedText.length;
          this.isTypingComplete = true;
        }
      }
    } else {
      // Auto-advance timer for monologues/cinematic banners
      if (this.currentNode.autoAdvanceMs && this.currentNode.autoAdvanceMs > 0) {
        this.autoAdvanceTimerMs += dtMs;
        if (this.autoAdvanceTimerMs >= this.currentNode.autoAdvanceMs) {
          this.handleInteraction();
        }
      }
    }
  }

  /**
   * Completes typing immediately or advances to next node
   */
  public handleInteraction(): void {
    if (!this.active || !this.currentNode) return;

    if (!this.isTypingComplete) {
      // Force complete text typing instantly
      this.typedCharCount = this.processedText.length;
      this.isTypingComplete = true;
      AndroidEngine.triggerHaptic(8);
      return;
    }

    // If typing complete and node has available choice options, player must tap a choice button
    const availableOptions = (this.currentNode.options || []).filter((opt) =>
      this.evaluateCondition(opt.condition)
    );

    if (availableOptions.length > 0) {
      return;
    }

    // Advance to next node or close
    if (
      this.currentNode.nextDialogueId &&
      this.activeTree?.nodes[this.currentNode.nextDialogueId]
    ) {
      this.currentNode = this.activeTree.nodes[this.currentNode.nextDialogueId];
      this.applyVariableChanges(this.currentNode.variableChanges);
      this.processedText = this.substituteVariables(this.currentNode.text);
      this.resetTypewriter();
      AndroidEngine.triggerHaptic(12);
    } else {
      this.closeDialogue();
    }
  }

  /**
   * Selects a branching choice option
   */
  public selectOption(optionIndex: number): void {
    if (!this.active || !this.currentNode || !this.currentNode.options) return;

    const availableOptions = this.currentNode.options.filter((opt) =>
      this.evaluateCondition(opt.condition)
    );
    const option = availableOptions[optionIndex];
    if (!option) return;

    AndroidEngine.triggerHaptic(20);
    soundEngine.play('powerup');

    this.applyVariableChanges(option.variableChanges);

    if (option.action && this.onExecuteAction) {
      this.onExecuteAction(option.action, option.actionParam);
    }

    if (option.nextDialogueId && this.activeTree?.nodes[option.nextDialogueId]) {
      this.currentNode = this.activeTree.nodes[option.nextDialogueId];
      this.applyVariableChanges(this.currentNode.variableChanges);
      this.processedText = this.substituteVariables(this.currentNode.text);
      this.resetTypewriter();
    } else {
      this.closeDialogue();
    }
  }

  public closeDialogue(): void {
    this.active = false;
    this.activeTree = null;
    this.currentNode = null;
  }

  public isActive(): boolean {
    return this.active;
  }

  public getCurrentNode(): DialogueNode | null {
    return this.currentNode;
  }

  /**
   * Renders Dialogue / Monologue Overlay onto Canvas
   */
  public renderOverlay(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    if (!this.active || !this.currentNode) return;

    ctx.save();

    const mode: DialogueMode = this.currentNode.mode || 'dialogue_box';

    if (mode === 'cinematic_banner') {
      this.renderCinematicBanner(ctx, canvasWidth, canvasHeight);
    } else if (mode === 'monologue_thought') {
      this.renderMonologueThought(ctx, canvasWidth, canvasHeight);
    } else {
      this.renderRPGDialogueBox(ctx, canvasWidth, canvasHeight);
    }

    ctx.restore();
  }

  /**
   * Mode 1: RPG Dialogue Box HUD Rendering
   */
  private renderRPGDialogueBox(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    if (!this.currentNode) return;

    const boxHeight = 135;
    const margin = 12;
    const boxY = canvasHeight - boxHeight - margin;
    const boxX = margin;
    const boxWidth = canvasWidth - margin * 2;

    // Background dark overlay
    ctx.fillStyle = 'rgba(2, 6, 23, 0.75)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Dialogue Box Window Base
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;

    this.drawRoundedRect(ctx, boxX, boxY, boxWidth, boxHeight, 14);
    ctx.fill();
    ctx.stroke();

    // Speaker Portrait Frame
    const portraitSize = 72;
    const portraitX = boxX + 12;
    const portraitY = boxY + 12;

    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    this.drawRoundedRect(ctx, portraitX, portraitY, portraitSize, portraitSize, 10);
    ctx.fill();
    ctx.stroke();

    // Portrait Icon + Mood Overlay
    this.renderSpeakerPortrait(
      ctx,
      portraitX,
      portraitY,
      portraitSize,
      this.currentNode.portraitPreset,
      this.currentNode.mood
    );

    // Speaker Name Badge
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(this.currentNode.speakerName.toUpperCase(), boxX + 96, boxY + 24);

    // Typewritten Text
    const visibleText = this.processedText.substring(0, this.typedCharCount);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '13px monospace';

    const maxLineLength = Math.floor((boxWidth - 115) / 7.5);
    const words = visibleText.split(' ');
    let line = '';
    let lineY = boxY + 44;

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      if (testLine.length > maxLineLength && i > 0) {
        ctx.fillText(line, boxX + 96, lineY);
        line = words[i] + ' ';
        lineY += 18;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, boxX + 96, lineY);

    // Filter available options with conditions
    const availableOptions = (this.currentNode.options || []).filter((opt) =>
      this.evaluateCondition(opt.condition)
    );

    // Choice Options OR Continuation Prompt
    if (this.isTypingComplete) {
      if (availableOptions.length > 0) {
        let optX = boxX + 96;
        for (let i = 0; i < availableOptions.length; i++) {
          const opt = availableOptions[i];
          ctx.fillStyle = '#0284c7';
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5;
          const optW = Math.min(180, (boxWidth - 110) / availableOptions.length - 8);
          this.drawRoundedRect(ctx, optX, boxY + boxHeight - 34, optW, 24, 6);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px sans-serif';
          ctx.fillText(`${i + 1}. ${opt.text}`, optX + 8, boxY + boxHeight - 18);
          optX += optW + 8;
        }
      } else {
        const pulse = Math.sin(Date.now() / 200) > 0 ? '▶ [Tap / Next]' : '▷ [Tap / Next]';
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(pulse, boxX + boxWidth - 14, boxY + boxHeight - 12);
      }
    }
  }

  /**
   * Mode 2: Monologue Thought Cloud Bubble
   */
  private renderMonologueThought(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    if (!this.currentNode) return;

    const boxWidth = Math.min(500, canvasWidth - 40);
    const boxHeight = 110;
    const boxX = (canvasWidth - boxWidth) / 2;
    const boxY = canvasHeight / 2 - 60;

    // Dark atmospheric vignette
    ctx.fillStyle = 'rgba(3, 7, 18, 0.82)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Thought Cloud Box
    ctx.fillStyle = '#1e1b4b';
    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 2.5;

    this.drawRoundedRect(ctx, boxX, boxY, boxWidth, boxHeight, 20);
    ctx.fill();
    ctx.stroke();

    // Thought Bubble Circles Tail
    ctx.beginPath();
    ctx.arc(boxX + 40, boxY + boxHeight + 12, 10, 0, Math.PI * 2);
    ctx.arc(boxX + 25, boxY + boxHeight + 28, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Speaker Name (Inner Monologue Header)
    ctx.fillStyle = '#c084fc';
    ctx.font = 'italic bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`💭 (Monolog Batin: ${this.currentNode.speakerName})`, boxX + 16, boxY + 22);

    // Italic Monologue Content
    const visibleText = this.processedText.substring(0, this.typedCharCount);
    ctx.fillStyle = '#e0e7ff';
    ctx.font = 'italic 13px serif';

    const maxLineLength = Math.floor((boxWidth - 32) / 8);
    const words = visibleText.split(' ');
    let line = '';
    let lineY = boxY + 44;

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      if (testLine.length > maxLineLength && i > 0) {
        ctx.fillText(line, boxX + 16, lineY);
        line = words[i] + ' ';
        lineY += 20;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, boxX + 16, lineY);

    if (this.isTypingComplete) {
      const pulse = Math.sin(Date.now() / 200) > 0 ? '••• [Lanjut]' : '••  [Lanjut]';
      ctx.fillStyle = '#a5b4fc';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(pulse, boxX + boxWidth - 16, boxY + boxHeight - 12);
    }
  }

  /**
   * Mode 3: Cinematic Banner Cutscene Overlay
   */
  private renderCinematicBanner(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    if (!this.currentNode) return;

    const bannerHeight = 90;

    // Top and Bottom Letterbox Bars
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvasWidth, bannerHeight);
    ctx.fillRect(0, canvasHeight - bannerHeight, canvasWidth, bannerHeight);

    // Centered Narrative Text
    const visibleText = this.processedText.substring(0, this.typedCharCount);
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 15px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillText(visibleText, canvasWidth / 2, canvasHeight - bannerHeight / 2);

    // Speaker Title Accent Top
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.fillText(`— ${this.currentNode.speakerName.toUpperCase()} —`, canvasWidth / 2, bannerHeight / 2);
  }

  private renderSpeakerPortrait(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    preset: string,
    mood?: DialogueMood
  ): void {
    const cx = x + size / 2;
    const cy = y + size / 2;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '34px sans-serif';

    let icon = '🧙‍♂️';
    switch (preset) {
      case 'hero':
        icon = '⚔️';
        break;
      case 'wizard':
        icon = '🧙‍♂️';
        break;
      case 'cyborg':
        icon = '🤖';
        break;
      case 'king':
        icon = '👑';
        break;
      case 'villain':
        icon = '🦹‍♂️';
        break;
      case 'robot':
        icon = '🦾';
        break;
      case 'ghost':
        icon = '👻';
        break;
      case 'guide':
        icon = '🧚';
        break;
    }

    ctx.fillText(icon, cx, cy - 2);

    // Mood Badge Icon
    if (mood && mood !== 'neutral') {
      let moodEmoji = '😐';
      if (mood === 'happy') moodEmoji = '😊';
      if (mood === 'angry') moodEmoji = '😡';
      if (mood === 'surprised') moodEmoji = '😲';
      if (mood === 'sad') moodEmoji = '😢';
      if (mood === 'mysterious') moodEmoji = '🔮';

      ctx.font = '14px sans-serif';
      ctx.fillText(moodEmoji, x + size - 10, y + 12);
    }

    ctx.restore();
  }

  private drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /**
   * Returns preset dialogue trees covering RPG NPC, Monologue, and Cutscene
   */
  public static getPresetDialogueTree(): DialogueTree {
    return {
      id: 'dt_intro_npc',
      title: 'Ksatria Bertemu Penjaga Reruntuhan',
      initialNodeId: 'node_1',
      variables: {
        player_name: 'Satria Hero',
        gold: 100,
        has_key: false,
      },
      nodes: {
        node_1: {
          id: 'node_1',
          speakerName: 'Penjaga Kuno',
          portraitPreset: 'wizard',
          mode: 'dialogue_box',
          mood: 'mysterious',
          text: 'Berhenti, {player_name}! Reruntuhan kuno ini dijaga rahasia. Kamu membawa {gold} Koin. Apakah kamu berani masuk?',
          options: [
            { id: 'opt_1', text: 'Saya Siap!', nextDialogueId: 'node_2' },
            { id: 'opt_2', text: '(Monolog Batin)', nextDialogueId: 'node_monologue' },
            { id: 'opt_3', text: 'Kembali Dulu', nextDialogueId: 'node_3' },
          ],
        },
        node_2: {
          id: 'node_2',
          speakerName: 'Penjaga Kuno',
          portraitPreset: 'wizard',
          mode: 'dialogue_box',
          mood: 'happy',
          text: 'Pilihan yang gagah berani! Ambil 50 Koin bonus ini dan teruskan perjuanganmu!',
          variableChanges: [{ varName: 'gold', operation: 'add', value: 50 }],
          options: [
            { id: 'opt_reward', text: 'Terima Kasih!', action: 'ADD_SCORE', actionParam: '50' },
          ],
        },
        node_monologue: {
          id: 'node_monologue',
          speakerName: 'Pikiran Hero',
          portraitPreset: 'hero',
          mode: 'monologue_thought',
          mood: 'neutral',
          text: 'Sepertinya tetua ini menyimpan Kunci Gerbang. Aku harus bersiap jika terjadi pertarungan...',
          nextDialogueId: 'node_1',
        },
        node_3: {
          id: 'node_3',
          speakerName: 'Penjaga Kuno',
          portraitPreset: 'wizard',
          mode: 'dialogue_box',
          mood: 'neutral',
          text: 'Bijaksana. Persiapkan dirimu sebelum menantang bahaya.',
        },
      },
    };
  }
}

export const dialogueEngine = new DialogueEngine();
