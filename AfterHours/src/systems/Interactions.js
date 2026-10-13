// ---------------------------------------------------------------
// AfterHours · Interactions.js
// ---------------------------------------------------------------
// A data-driven effect runner. An interaction is a list of typed
// effects; this executes them in order. It owns no game state —
// `env` supplies the verbs — so a new effect type is one new case
// here plus one handler in main.js.
// ---------------------------------------------------------------

const delay = (ms) => new Promise(r => setTimeout(r, ms || 0));

export async function run(effects, env) {
  for (const e of effects) await step(e, env);
}

async function step(e, env) {
  if ('modal' in e)            env.openModal(e.modal);
  else if ('dialog' in e)      await env.dialog(e.dialog);
  else if ('wait' in e)        await delay(e.wait);
  else if ('sound' in e)     { env.ambience.oneShot(e.sound); await delay(e.duration || 0); }
  else if ('spawn' in e)       env.spawn(e.spawn);
  else if ('despawn' in e)     env.despawn(e.despawn);
  else if ('toggle_fire' in e) env.toggleFire();
  else if ('cycle_weather' in e) env.cycleWeather(e.cycle_weather);
  else if ('serve_sushi' in e) await env.serveSushi();
}
