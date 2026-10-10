import type { Ability, SkillPath } from '../data/types';
import boon from '../assets/ui/boon.png';
import AbilityTip from './AbilityTip';
import Tip from './Tip';

const COLS = Array.from({ length: 16 }, (_, i) => i + 1);

/**
 * Ability upgrade order, in the original style: striped ability rows, dashed step columns, a purple glowing
 * badge where an ability is unlocked, and gray badges (with the boon icon) for its 1 / 2 / 5 AP upgrades.
 */
export default function SkillTree({ path, abilities, compact = false }: { path: SkillPath; abilities?: Ability[]; compact?: boolean }) {
  return (
    <div className={`panel${compact ? ' skill-compact' : ''}`}>
      {compact && <div className="skill-title"><h3>Skill priority</h3><small>Ability unlocks and upgrades by step</small></div>}
      <div className="skill-wrap">
        <table className="skill">
          <caption className="sr-only">Ability unlock and upgrade order across 16 steps</caption>
          <thead>
            <tr>
              <th scope="col"><span className="sr-only">Ability</span></th>
              {COLS.map((c) => <th key={c} scope="col">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {path.rows.map((row) => {
              const ab = abilities?.[row.abilityIndex];
              return (
                <tr key={row.abilityIndex}>
                  <th scope="row">
                    {ab ? (
                      <Tip className="ab" prefer="below" content={<AbilityTip ability={ab} slot={row.abilityIndex} />}>
                        <img src={ab.icon} alt="" />
                        <span className={compact ? 'sr-only' : ''}>{ab.name}</span>
                      </Tip>
                    ) : (
                      <span className="ab"><span className="ph" aria-hidden="true">{row.abilityIndex + 1}</span><span>{`Ability ${row.abilityIndex + 1}`}</span></span>
                    )}
                  </th>
                  {COLS.map((c) => {
                    const up = row.upgrades.find((u) => u.at === c);
                    return (
                      <td key={c}>
                        {row.unlockAt === c && <img className="unlock" src={boon} alt={`Step ${c}: unlock`} />}
                        {up && <span className="ap" title={`Step ${c}: ${up.ap} AP`}><img src={boon} alt="" /><span>{up.ap}</span></span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="skill-legend">
        <span><img className="unlock" src={boon} alt="" /> Unlock the ability</span>
        <span><span className="ap"><img src={boon} alt="" /><span>1</span></span> Spend 1, 2 or 5 ability points</span>
      </div>
      <p className="note" style={{ padding: '0 6px 14px' }}>{path.note}</p>
    </div>
  );
}
