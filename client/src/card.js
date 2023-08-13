import "./card.css"

function statusEnumToString(status) {
  let statusTemp = status;
  if(typeof statusTemp !== "number") statusTemp = status.on;
  console.log('status', status, ", statusTemp", statusTemp)
  switch (statusTemp) {
    case 0:
    case false:
      return "Inactive";
    case 1:
    case true:
      return "Active";
    default:
      return "Unknown";
  }
}

export default function Card({card}) {
  console.log(card)
  return (
    <div className="card">
      <h1>{card.name}</h1>
      <p>{statusEnumToString(card.status)}</p>
    </div>
  )
}