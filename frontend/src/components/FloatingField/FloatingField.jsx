import React from 'react';
import './FloatingField.css';

/**
 * Floating-label text field (website).
 * - No separate heading; the label renders inside the field like a placeholder
 * - On focus or when the field has a value, the label floats onto the top border
 * - Border-only field (transparent background), border highlights on focus
 *
 * Usage:
 *   <FloatingField label="Full Name" icon={<Icons.User size={14} />} bg={C.card} {...inputProps} />
 */
const FloatingField = ({
  label,
  icon,
  right,
  wrapStyle,
  bg = '#ffffff',
  style,
  ...inputProps
}) => {
  const hasIcon = Boolean(icon);
  return (
    <div
      className={`ff-field${hasIcon ? '' : ' no-icon'}`}
      style={{ '--ff-bg': bg, ...wrapStyle }}
    >
      {hasIcon && <span className="ff-icon">{icon}</span>}
      <input
        className="ff-input"
        placeholder={typeof label === 'string' ? label : ' '}
        {...inputProps}
        style={{ ...style, paddingLeft: hasIcon ? 36 : 14 }}
      />
      <label className="ff-label">{label}</label>
      {right}
    </div>
  );
};

export default FloatingField;
