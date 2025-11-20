// GoogleUsernameModal.jsx
import React from "react";
import Modal from "./Modal";
import "./modal.css";
export default function GoogleUsernameModal({
  googleUsername,
  setGoogleUsername,
  handleSetGoogleUsername,
  handleCancel,
  error,
  isOpen,
}) {
  return (
    <Modal title="Set a Username" isOpen={isOpen} onClose={handleCancel}>
      <input
        type="text"
        placeholder="Enter your username"
        value={googleUsername}
        onChange={(e) => setGoogleUsername(e.target.value)}
      />
      <div className="modal-buttons">
        <button onClick={handleSetGoogleUsername}>Save</button>
        <button onClick={handleCancel}>Cancel</button>
      </div>
      {error && <p className="error-msg">{error}</p>}
    </Modal>
  );
}
