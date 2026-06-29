import { useState } from 'react';
import { Field, ModalShell, SelectInput, TextInput } from '../../../components';
import type { EditableUserField } from '../../../store/actions';

const fieldOptions: Partial<Record<EditableUserField, string[]>> = {
  gender: ['女', '男', '其他', '未知'],
  country: ['UAE', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Oman', 'Bahrain', 'Egypt', 'Turkey', 'Morocco', 'Jordan'],
  contentRegion: ['中东区', '海湾区', '北非区', '土耳其区', '全球区'],
};

function optionsWithCurrent(currentValue: string, options: string[]) {
  return currentValue && !options.includes(currentValue) ? [currentValue, ...options] : options;
}

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
  const options = fieldOptions[field];

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
        {options ? (
          <SelectInput value={value} onChange={setValue} options={optionsWithCurrent(value, options)} />
        ) : (
          <TextInput value={value} onChange={setValue} placeholder={`请输入${label}`} />
        )}
      </Field>
    </ModalShell>
  );
}
