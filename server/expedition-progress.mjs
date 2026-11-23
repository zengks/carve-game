import {canonical, EXPEDITION_COURSE, EXPEDITION_RULES, validateExpeditionEvent} from '../shared/contract.mjs';
import {digest, equal} from './oidc.mjs';

// Both transports use the same private player ID and serialize snapshots in a
// single account/testing bucket. The immutable event count is its revision.
export async function expeditionProgress(client, actor, testing, event) {
  // Avoid holding a player row lock while waiting on an upload that needs its foreign key.
  const {rows:[owner]}=await client.query(`select p.id,p.scope_key from carve_shared_v1.identities i
    join carve_shared_v1.players p on p.id=i.player_id where i.issuer=$1 and i.subject=$2`,[actor.issuer,actor.subject]);
  if(!owner||owner.id!==actor.player_id||!equal(owner.scope_key,actor.scope)){
    throw Object.assign(Error('sign_in_required'),{status:401});
  }
  const player=owner.id;
  const prefix = EXPEDITION_COURSE + ':%';
  await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))', [EXPEDITION_COURSE+':'+player+':'+testing]);
  let accepted;
  if (event) {
    validateExpeditionEvent(event);
    if (event.payload.testing !== testing) throw Object.assign(Error('invalid_event'), {status:400});
    const payload = canonical(event), hash = digest(payload);
    await client.query(`insert into carve_shared_v1.completed_results(player_id,event_id,payload_hash,event)
      values($1,$2,$3,$4::jsonb) on conflict do nothing`, [player,event.event_id,hash,payload]);
    const {rows:[stored]} = await client.query('select payload_hash,event from carve_shared_v1.completed_results where player_id=$1 and event_id=$2', [player,event.event_id]);
    if (stored?.payload_hash !== hash) throw Object.assign(Error('event_conflict'), {status:409});
    accepted = stored.event;
  }
  const {rows:[snapshot]} = await client.query(`
    with ranked as (
      select event, event->>'mode' as mode, row_number() over (
        partition by event->>'mode'
        order by (event->'payload'->>'height_m')::bigint desc,
          (event->'payload'->>'score')::bigint desc, (event->'payload'->>'active_ms')::bigint, event_id collate "C"
      ) as rank
      from carve_shared_v1.completed_results
      where player_id=$1 and event_id like $2 and event->'payload'->'testing' = to_jsonb($3::boolean)
    )
    select count(*)::text as revision, coalesce(
      jsonb_agg(event order by mode collate "C",rank) filter (where rank<=10),'[]'::jsonb
    ) as results from ranked`, [player,prefix,testing]);
  return {
    course_id:EXPEDITION_COURSE, rules_version:EXPEDITION_RULES, testing,
    revision:Number(snapshot.revision), results:snapshot.results, validation:'client_reported',
    ...(accepted ? {accepted_event:accepted} : {}),
  };
}
