export default function UserIcon({ style, className, inline }) {
  const svgStyle = inline
    ? { display: 'inline-block', marginRight: '5px', verticalAlign: 'middle', ...style }
    : { display: 'block', margin: '0 auto 5px auto', ...style };

  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={svgStyle}
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
