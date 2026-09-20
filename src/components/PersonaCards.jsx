// Human faces of supplier-side acceptance — fictional personas cast from the
// client's supplied photography. All names, roles, companies and statements
// are fictional and simulated locally for the demo.
import personaContact from '../assets/persona-contact.jpg'
import personaOpsA from '../assets/persona-ops-a.jpg'
import personaOpsB from '../assets/persona-ops-b.jpg'

export const OPS_TEAM = [
  { name: 'Priya Raman', role: 'Operations Manager', img: personaOpsA },
  { name: 'Elena Vargas', role: 'Production Lead', img: personaOpsB },
]

export const INTRO_CONTACT = {
  name: 'Marcus Bell',
  role: 'Partner Relations',
  img: personaContact,
}

function PersonaBubble({ people }) {
  return (
    <div className="pcard__faces">
      {people.map((p) => (
        <figure key={p.name} className="pcard__person">
          <img src={p.img} alt={`${p.name}, ${p.role} (fictional demo persona)`} loading="lazy" />
          <figcaption>
            <strong>{p.name}</strong>
            <span>{p.role}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  )
}

// Two supplier ops managers accepting the quote / confirming the PO.
export function OpsApprovalCard({ supplier, headline, lines, stamp }) {
  return (
    <div className="pcard pcard--ops">
      <div className="pcard__kicker">
        <span className="pcard__dot" aria-hidden="true" />
        Supplier operations · {supplier}
      </div>
      <p className="pcard__headline">{headline}</p>
      <PersonaBubble people={OPS_TEAM} />
      {lines?.length > 0 && (
        <ul className="pcard__lines">
          {lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      )}
      {stamp && <div className="pcard__stamp">{stamp}</div>}
    </div>
  )
}

// The contact who accepted the warm-introduction call.
export function IntroAcceptCard({ supplier, headline, lines, stamp }) {
  return (
    <div className="pcard pcard--intro">
      <div className="pcard__kicker">
        <span className="pcard__dot" aria-hidden="true" />
        Warm intro accepted · {supplier}
      </div>
      <p className="pcard__headline">{headline}</p>
      <PersonaBubble people={[INTRO_CONTACT]} />
      {lines?.length > 0 && (
        <ul className="pcard__lines">
          {lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      )}
      {stamp && <div className="pcard__stamp">{stamp}</div>}
    </div>
  )
}
