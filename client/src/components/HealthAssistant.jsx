import React from "react";
import { useNavigate } from "react-router-dom";

export default function HealthAssistant() {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate("/health-assistant");
  };

  return (
    <button
      onClick={handleClick}
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        width: "52px",
        height: "52px",
        borderRadius: "50%",
        background: "linear-gradient(135deg, #8b5e34 0%, #6f4518 100%)",
        border: "1px solid #f3e7dc",
        boxShadow: "0 3px 12px rgba(139, 94, 52, 0.25)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        transition: "all 0.3s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.08)";
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(139, 94, 52, 0.4)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.boxShadow = "0 3px 12px rgba(139, 94, 52, 0.25)";
      }}
      title="Health Assistant"
      aria-label="Health Assistant"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5V7C15 8.10457 14.1046 9 13 9H11C9.89543 9 9 8.10457 9 7V5Z"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M6 9C6 7.89543 6.89543 7 8 7H16C17.1046 7 18 7.89543 18 9V11C18 12.1046 17.1046 13 16 13H8C6.89543 13 6 12.1046 6 11V9Z"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M12 13V21"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M9 17H15"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="18" cy="18" r="3" stroke="white" strokeWidth="1.5" />
      </svg>
    </button>
  );
}
