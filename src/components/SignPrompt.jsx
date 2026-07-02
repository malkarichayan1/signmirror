import './SignPrompt.css';

export default function SignPrompt({ sign }) {
  return (
    <div className="sign-prompt">
      <div className="sign-image-placeholder" aria-hidden="true">
        🤟
      </div>
      <h2 className="sign-name">{sign.name}</h2>
      <p className="sign-description">{sign.description}</p>
    </div>
  );
}
