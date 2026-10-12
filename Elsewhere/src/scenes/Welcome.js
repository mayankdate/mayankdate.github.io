// ---------------------------------------------------------------
// Elsewhere · Welcome.js
// ---------------------------------------------------------------
// A quiet intro. Pixel-Mayank, a line of flavour text, a nudge
// to click. Pressing anything hands off to Island.
// ---------------------------------------------------------------

export class Welcome extends Phaser.Scene {
  constructor() { super('Welcome'); }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#0D2545');

    const npc = this.add.image(width / 2, height / 2 - 40, 'mayank_npc');
    npc.setScale(3);
    npc.setDepth(10);

    this.tweens.add({
      targets: npc,
      y: npc.y - 6,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add.text(width / 2, height / 2 + 50,
      'Elsewhere', {
      fontFamily: 'Fraunces, Georgia, serif',
      fontSize: '56px',
      color: '#F5EBD6',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 110,
      'This place runs on fireflies.\nSpirit transfer only — leave your body at the door.',
      {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '18px',
        color: '#B8893E',
        align: 'center',
        lineSpacing: 6,
      }).setOrigin(0.5);

    const cta = this.add.text(width / 2, height / 2 + 190,
      'Click anywhere to drift in →',
      {
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '14px',
        color: '#F5EBD6',
      }).setOrigin(0.5);

    this.tweens.add({
      targets: cta,
      alpha: { from: 1, to: 0.4 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
    });

    this.input.once('pointerdown', () => this.scene.start('Island'));
    this.input.keyboard.once('keydown', () => this.scene.start('Island'));
  }
}
