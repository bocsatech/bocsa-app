"use client";

import MachineAddForm from "./MachineAddForm";
import type { SessionAuthSlice } from "../../lib/machine-permissions";
import type { Machine } from "../../lib/types/machine";

type Props = {
  open: boolean;
  canCreate: boolean;
  sessionAuth: SessionAuthSlice;
  onClose: () => void;
  onSaved: (machine: Machine) => void;
};

export default function MachineAddModal({
  open,
  canCreate,
  sessionAuth,
  onClose,
  onSaved,
}: Props) {
  if (!open) return null;

  return (
    <div className="qrModalBackdrop machineAddModalBackdrop">
      <MachineAddForm
        active={open}
        variant="modal"
        canCreate={canCreate}
        sessionAuth={sessionAuth}
        onCancel={onClose}
        onSaved={onSaved}
      />
    </div>
  );
}
