import { QueryField } from '../../components';
import { primaryBtnClass, secondaryBtnClass } from '../../utils/ui';

export interface UserSearchValues {
  mid: string;
  name: string;
  phone: string;
  email: string;
}

export const emptyUserSearch: UserSearchValues = { mid: '', name: '', phone: '', email: '' };

/** 用户查询条（docx §1：mid / 昵称 / 手机号 / 邮箱）。 */
export function UserSearchBar({
  values,
  onChange,
  onSearch,
  onReset,
}: {
  values: UserSearchValues;
  onChange: (values: UserSearchValues) => void;
  onSearch: () => void;
  onReset: () => void;
}) {
  const set = (key: keyof UserSearchValues) => (v: string) => onChange({ ...values, [key]: v });

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="grid gap-3 xl:grid-cols-[1fr_1fr_1fr]">
        <QueryField label="用户mid" placeholder="用户mid" value={values.mid} onChange={set('mid')} />
        <QueryField label="用户昵称" placeholder="请输入用户昵称" value={values.name} onChange={set('name')} />
        <QueryField label="用户手机号" placeholder="请输入用户手机号" value={values.phone} onChange={set('phone')} />
        <QueryField label="用户邮箱" placeholder="请输入用户邮箱" value={values.email} onChange={set('email')} />
        <div className="flex items-end gap-2">
          <button type="button" onClick={onSearch} className={primaryBtnClass}>
            查询
          </button>
          <button type="button" onClick={onReset} className={secondaryBtnClass}>
            重置
          </button>
        </div>
      </div>
    </div>
  );
}
