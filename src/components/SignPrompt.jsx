import SkeletonReplay from './SkeletonReplay.jsx';
import ExpandableHandPreview from './ExpandableHandPreview.jsx';
import './SignPrompt.css';

export default function SignPrompt({ sign }) {
  return (
    <div className="sign-prompt">
      <div className="sign-image-placeholder">
        <ExpandableHandPreview frames={[sign.landmarks]} label={sign.name}>
          <SkeletonReplay frames={[sign.landmarks]} size={96} />
        </ExpandableHandPreview>
      </div>
      <h2 className="sign-name">{sign.name}</h2>
      <p className="sign-description">{sign.description}</p>
    </div>
  );
}
