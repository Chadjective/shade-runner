import * as THREE from 'three';

const SAMPLE_DT = 0.12; // record ~8 samples/sec

/**
 * GhostSystem — records the player's path this run, and (if a saved best run
 * exists) replays it as a translucent ghost to race against. Recording is a
 * compact [t, x, y, z] array suitable for localStorage; playback interpolates
 * between samples by the run timer.
 */
export default class GhostSystem {
  constructor(scene, samples) {
    this.scene = scene;
    this.recording = [];
    this.samples = samples && samples.length ? samples : null;
    this.ghost = null;
    this._i = 0;
    if (this.samples) {
      this.ghost = this._build();
      scene.add(this.ghost);
    }
  }

  _build() {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x9fe8ff, emissive: 0x2a7fae, emissiveIntensity: 0.6,
      transparent: true, opacity: 0.38, depthWrite: false,
    });
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 1.0, 4, 8), mat);
    body.position.y = 0.9;
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), mat);
    head.position.y = 1.55;
    g.add(head);
    return g;
  }

  /** Record this run (throttled). */
  record(t, pos) {
    const r = this.recording;
    if (r.length === 0 || t - r[r.length - 1][0] >= SAMPLE_DT) {
      r.push([+t.toFixed(2), +pos.x.toFixed(2), +pos.y.toFixed(2), +pos.z.toFixed(2)]);
    }
  }

  /** Move the playback ghost to where the best run was at time t. */
  update(t) {
    if (!this.ghost || !this.samples) return;
    const s = this.samples;
    while (this._i < s.length - 1 && s[this._i + 1][0] <= t) this._i++;
    const a = s[this._i];
    const b = s[Math.min(this._i + 1, s.length - 1)];
    const span = b[0] - a[0] || 1;
    const f = Math.min(1, Math.max(0, (t - a[0]) / span));
    this.ghost.position.set(a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f);
    this.ghost.visible = t <= s[s.length - 1][0] + 0.3;
  }

  getRecording() {
    return this.recording;
  }
}
