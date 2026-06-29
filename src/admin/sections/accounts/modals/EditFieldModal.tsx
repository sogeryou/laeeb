import { useState } from 'react';
import { Field, ModalShell, TextInput } from '../../../components';
import type { EditableUserField } from '../../../store/actions';

/** 编辑单个基础信息字段（docx §2.B 账号信息修改）。 */
export function EditFieldModal({
  field,
  label,
  currentValue,
  userLabel,
  onClose,
  onConfirm,
}: {
  field: EditableUserField;
  label: string;
  currentValue: string;
  userLabel: string;
  onClose: () => void;
  onConfirm: (field: EditableUserField, value: string) => void;
}) {
  const [value, setValue] = useState(currentValue);

  return (
    <ModalShell
      title={`修改${label}`}
      subtitle={userLabel}
      onClose={onClose}
      onConfirm={() => onConfirm(field, value.trim())}
      confirmText="保存修改"
      confirmDisabled={value.trim() === currentValue.trim()}
      maxWidth="max-w-md"
    >
      <Field label={label}>
        <TextInput value={value} onChange={setValue} placeholder={`请输入${label}`} />
      </Field>
    </ModalShell>
  );
}
