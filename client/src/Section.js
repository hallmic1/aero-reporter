import './card.css'
import Card from "./card";

export default function Section({name, list }) {
  if(list && list.length > 0) {
    return (
      <>
        <h1 className="section-name">{name}</h1>
        <div className="card-section">
        {list.map((entry, index) => {
          return <Card key={index} card={entry} />
        })}
        </div>
      </>
    )
  }
  return (
    <>
      <h1 className="section-name">{name}</h1>
      <h1 className="placeholder-text">Loading...</h1>
    </>
  )
}