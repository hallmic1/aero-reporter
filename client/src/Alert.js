import "./Alert.css";

export default function Alert({show, message}) {
    return (
        <div className="alert-dialog" style={{display: show ? 'block' : 'none'}}>
            {message}
        </div>
    )
}