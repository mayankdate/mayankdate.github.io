// ---------------------------------------------------------------
// Elsewhere · Welcome.js
// ---------------------------------------------------------------
// A tiny interactive cold-open:
//   1. Pixel-Mayank stands on a dark stage.
//   2. "Spinning up a digital clone of you…" with a progress bar.
//   3. The blob plops in from above with a bounce.
//   4. Mayank delivers the "that doesn't look like you" line, then
//      the actual Elsewhere greeting.
//   5. CTA → Island.
// All text is clickable to skip ahead.
// ---------------------------------------------------------------

const CREAM = '#F5EBD6';
const GOLD  = '#B8893E';
const INK   = '#8aa0bf';

export class Welcome extends Phaser.Scene {
  constructor() { super('Welcome'); }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const groundY = height / 2 + 60;

    this.cameras.main.setBackgroundColor('#0D2545');

    // --- Pixel-Mayank, standing stage-left of centre
    const mayank = this.add.image(cx - 60, groundY, 'mayank_npc')
      .setOrigin(0.5, 1).setScale(3).setDepth(10);
    this.tweens.add({
      targets: mayank,
      y: groundY - 3,
      duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // --- Title + loading UI (first beat)
    const title = this.add.text(cx, 60, 'Elsewhere', {
      fontFamily: 'Fraunces, Georgia, serif',
      fontSize: '42px', color: CREAM, fontStyle: 'bold',
    }).setOrigin(0.5);

    const sub = this.add.text(cx, 110,
      'Spinning up a digital clone of you…', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '14px', color: GOLD,
    }).setOrigin(0.5);

    const barW = 240, barH = 6;
    const barBg = this.add.rectangle(cx, 140, barW, barH, 0x1a3660)
      .setOrigin(0.5).setStrokeStyle(1, 0xB8893E);
    const barFill = this.add.rectangle(cx - barW/2 + 1, 140, 0, barH - 2,
      0xB8893E).setOrigin(0, 0.5);

    // Dialog box (hidden until the plop)
    const dialog = this.add.text(cx, height - 90, '', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '18px', color: CREAM, align: 'center',
      wordWrap: { width: Math.min(640, width - 60) },
      lineSpacing: 6,
    }).setOrigin(0.5, 1).setDepth(20);

    const cta = this.add.text(cx, height - 32, '', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '13px', color: INK,
    }).setOrigin(0.5, 1).setAlpha(0);

    // --- Skip-ahead affordance
    const skip = this.add.text(width - 16, 16, 'skip ›', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '12px', color: INK,
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    skip.on('pointerdown', () => this.scene.start('Island'));

    // --- Beat 1: load the progress bar over 1600ms
    this.tweens.add({
      targets: barFill,
      width: barW - 2,
      duration: 1600,
      ease: 'Sine.easeInOut',
      onComplete: () => this.plopTheBlob({
        cx, groundY, title, sub, barBg, barFill, dialog, cta,
      }),
    });
  }

  plopTheBlob({ cx, groundY, title, sub, barBg, barFill, dialog, cta }) {
    sub.setText('Clone ready. Transferring…');

    // Blob falls in from above, lands with a bounce next to Mayank.
    const blob = this.add.sprite(cx + 60, -40, 'player', 1)
      .setOrigin(0.5, 1).setScale(3).setDepth(10);

    this.tweens.add({
      targets: blob,
      y: groundY,
      duration: 900,
      ease: 'Bounce.easeOut',
      onComplete: () => {
        // Shrink the loader; show the dialog beats
        this.tweens.add({
          targets: [title, sub, barBg, barFill],
          alpha: 0, duration: 400,
          onComplete: () => this.runDialog(dialog, cta),
        });
        // Tiny landing bob
        this.tweens.add({
          targets: blob, scaleY: { from: 3, to: 2.6 },
          duration: 140, yoyo: true, ease: 'Sine.easeInOut',
        });
      },
    });
  }

  runDialog(dialog, cta) {
    const beats = [
      "…huh. That doesn't look like you.",
      "But hey — you can run around.",
      "Welcome to Elsewhere. Every portfolio I'd ever read felt like a lobby. I wanted a living room.",
      "Wander. Click the shelves, the records, the walls. Pet the cat — she tolerates about four.",
    ];

    let i = 0;
    const show = () => {
      dialog.setText(beats[i]).setAlpha(0);
      this.tweens.add({
        targets: dialog, alpha: 1, duration: 300,
      });
    };
    show();

    const advance = () => {
      i++;
      if (i < beats.length) {
        show();
      } else {
        dialog.setText('');
        cta.setText('click or press any key to drift in →').setAlpha(0);
        this.tweens.add({
          targets: cta, alpha: 1, duration: 400,
          onComplete: () => {
            this.tweens.add({
              targets: cta,
              alpha: { from: 1, to: 0.4 },
              duration: 1000, yoyo: true, repeat: -1,
            });
            // Only now accept the Enter trigger
            this.input.once('pointerdown', () => this.scene.start('Island'));
            this.input.keyboard.once('keydown',
              () => this.scene.start('Island'));
          },
        });
      }
    };

    // Click-to-advance beats; auto-advance after a beat-length too so
    // someone who steps away still progresses.
    const tap = () => {
      if (i >= beats.length) return;
      this.time.removeAllEvents();  // cancel pending auto-advance
      advance();
      scheduleAuto();
    };
    const scheduleAuto = () => {
      if (i >= beats.length) return;
      this.time.delayedCall(2800, () => {
        if (i < beats.length) { advance(); scheduleAuto(); }
      });
    };
    this.input.on('pointerdown', tap);
    scheduleAuto();
  }
}
