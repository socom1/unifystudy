import React from "react";
import Modal from "../passwordM/Modal";

export default function EmailVerificationModal({ isOpen, onClose, email }) {
  return (
    <Modal title="Verify Your Email" isOpen={isOpen} onClose={onClose}>
      <p>
        A verification link has been sent to <strong>{email}</strong>. Please
        check your inbox and click the link to verify your account.
      </p>
      <p>If you didn’t receive the email, try checking your spam folder.</p>
      <div className="modal-buttons">
        <button onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}
