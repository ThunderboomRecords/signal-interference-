import React from "react";
import { Button } from "./button";

interface ConfirmationDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="confirmation-dialog">
      <div className="confirmation-dialog-content">
        <p>Are you sure you want to delete this item?</p>
        <Button onClick={onConfirm} className="confirm-button">Confirm</Button>
        <Button onClick={onCancel} className="cancel-button">Cancel</Button>
      </div>
    </div>
  );
};

