import ExpandableHandPreview from './ExpandableHandPreview.jsx';
import './SignPrompt.css';

export default function SignPrompt({ sign }) {
  return (
    <div className="sign-prompt">
      <ExpandableHandPreview frames={[sign.landmarks]} label={sign.name} />
      <h2 className="sign-name">{sign.name}</h2>
      <p className="sign-description">{sign.description}</p>
    </div>
  );
}
