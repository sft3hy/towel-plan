import { PHASES, STAGES } from '../../content/stages'
import { navigate } from '../../lib/router'

/** RoadmapStrip — compact phase overview linking into the full roadmap. */
export function RoadmapStrip() {
  return (
    <div className="rstrip" role="list" aria-label="Roadmap phases">
      {PHASES.map((ph, i) => {
        const stages = STAGES.filter((s) => s.phase === ph.id)
        return (
          <div className="rstrip__phase" key={ph.id} role="listitem">
            <div className={`rstrip__head rstrip__head--${ph.id}`}>
              <span className="rstrip__num">{String(i + 1).padStart(2, '0')}</span>
              <span className="rstrip__headbody">
                <span className="rstrip__title">{ph.label}</span>
                <span className="rstrip__blurb">{ph.blurb}</span>
              </span>
            </div>
            <div className="rstrip__stages">
              {stages.map((s) => (
                <button key={s.n} type="button" className={`rstrip__stage rstrip__stage--${s.topic}`} onClick={() => navigate(`/stage/${s.n}`)}>
                  <span className="rstrip__stageNum">{s.n}</span>
                  <span className="rstrip__stageName">{s.short}</span>
                </button>
              ))}
            </div>
            {i < PHASES.length - 1 ? <span className="rstrip__gate" aria-label="gate between phases">▸ gate</span> : null}
          </div>
        )
      })}
    </div>
  )
}
