import { useState, type ReactNode } from 'react';
import { Ban, Copy, Edit3, ShieldCheck, Trash2, UserCheck } from 'lucide-react';
import { ActionButton, Badge, Field, IconMiniButton, ModalShell, Panel, SelectInput, TextInput } from '../../components';
import { useToast } from '../../components/Toast';
import { useClipboard } from '../../hooks/useClipboard';
import { useAdminStore } from '../../store/useAdminStore';
import type { EditableUserField } from '../../store/actions';
import type { AdminUser } from '../../types';
import { formatNumber } from '../../utils/format';
import { BanConfigModal } from './modals/BanConfigModal';
import { EditFieldModal } from './modals/EditFieldModal';

type EditState = { field: EditableUserField; label: string; value: string } | null;
const defaultAvatarSvg = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <rect width="120" height="120" rx="60" fill="#e2e8f0"/>
  <circle cx="60" cy="45" r="20" fill="#94a3b8"/>
  <path d="M28 99c6-22 20-33 32-33s26 11 32 33" fill="#94a3b8"/>
</svg>
`);
const defaultAvatarUrl = `data:image/svg+xml;charset=UTF-8,${defaultAvatarSvg}`;

/** 用户基础信息面板（docx §1.A + §2.B 修改/删减 + 封禁/解封）。 */
export function UserBasicInfo({
  user,
  onSelectDevice,
}: {
  user: AdminUser;
  onSelectDevice: (deviceId: string) => void;
}) {
  const { state, dispatch } = useAdminStore();
  const { toast } = useToast();
  const copy = useClipboard();
  const [showBan, setShowBan] = useState(false);
  const [showUnban, setShowUnban] = useState(false);
  const [showPhoneEdit, setShowPhoneEdit] = useState(false);
  const [edit, setEdit] = useState<EditState>(null);

  const userLabel = `${user.id} / ${user.name}`;
  const phone = splitPhone(user.phone);
  const avatarSrc = user.avatar || defaultAvatarUrl;

  const openEdit = (field: EditableUserField, label: string, value: string) =>
    setEdit({ field, label, value });

  const deleteField = (field: EditableUserField, label: string) => {
    dispatch({ type: 'USER_FIELD_DELETE', payload: { userId: user.id, field } });
    toast(`已删除${label}`, 'success');
  };

  return (
    <Panel title="基础信息" icon={UserCheck}>
      <div className="grid gap-6 xl:grid-cols-[156px_minmax(0,1fr)] xl:items-start">
        <div className="pt-2">
          <div className="group relative mx-auto size-28 overflow-hidden rounded-full border border-slate-200">
            <img src={avatarSrc} alt={user.name} className="size-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-slate-950/45 opacity-0 transition group-hover:opacity-100">
              <IconMiniButton label="修改头像" icon={Edit3} onClick={() => toast('已打开头像编辑（示例）', 'info')} />
              <IconMiniButton label="删除头像" icon={Trash2} onClick={() => deleteField('avatar', '头像')} />
            </div>
          </div>
          <div className="mt-4 grid gap-2">
            <ActionButton icon={Ban} label="封禁" tone="danger" onClick={() => setShowBan(true)} />
            <ActionButton icon={ShieldCheck} label="解封" onClick={() => setShowUnban(true)} />
          </div>
        </div>

        <div className="space-y-5">
          <InfoGroup title="账号资料">
            <InfoItem label="user_id" value={user.id} onCopy={() => copy(user.id, 'user_id')} />
            <InfoItem label="用户名" value={user.name} onEdit={() => openEdit('name', '用户名', user.name)} onDelete={() => deleteField('name', '用户名')} />
            <InfoItem label="性别" value={user.gender} onEdit={() => openEdit('gender', '性别', user.gender)} />
            <InfoItem label="国家" value={user.country} onEdit={() => openEdit('country', '国家', user.country)} />
            <InfoItem label="当前身份" value={user.role} />
            <InfoItem label="状态" value={user.status} badge />
            <InfoItem label="注册时间" value={`${user.registeredAt}(UTC+3)`} />
            <InfoItem label="最近一次登陆时间" value={`${user.lastLoginAt}(UTC+3)`} />
          </InfoGroup>

          <InfoGroup title="资产数据">
            <InfoItem label="金币余额" value={formatNumber(user.coins)} highlight noWrap />
            <InfoItem label="钻石余额" value={formatNumber(user.diamonds)} highlight noWrap />
            <InfoItem label="历史累积充值（金币）" value={formatNumber(user.totalRecharge)} noWrap />
            <InfoItem label="历史累计收钻" value={formatNumber(user.totalReceivedDiamonds)} noWrap />
          </InfoGroup>

          <InfoGroup title="绑定与设备环境">
            <InfoItem label="绑定手机号" value={user.phone} onEdit={() => setShowPhoneEdit(true)} onDelete={() => deleteField('phone', '绑定手机号')} />
            <InfoItem label="绑定邮箱" value={user.email} onEdit={() => openEdit('email', '绑定邮箱', user.email)} onDelete={() => deleteField('email', '绑定邮箱')} />
            <InfoItem label="IP" value={user.ip} onCopy={() => copy(user.ip, 'IP')} />
            <InfoItem label="设备型号" value={user.device.split(' / ')[0]} />
            <InfoItem
              label="设备号"
              value={user.did}
              onCopy={() => copy(user.did, '设备号')}
              onValueClick={() => onSelectDevice(user.did)}
            />
            <InfoItem label="版本信息" value={user.version} />
            <InfoItem label="注册sim卡" value={user.simCard} />
            <InfoItem label="设备语言" value={user.systemLanguage} />
            <InfoItem label="归属大区" value={user.contentRegion} onEdit={() => openEdit('contentRegion', '归属大区', user.contentRegion)} />
          </InfoGroup>
        </div>
      </div>

      {showBan && (
        <BanConfigModal
          user={user}
          mode="ban"
          onClose={() => setShowBan(false)}
          onConfirm={(payload) => {
            dispatch({ type: 'USER_BAN', payload: { userId: user.id, ...payload } });
            setShowBan(false);
            toast(`已封禁 ${user.name}`, 'success');
          }}
        />
      )}
      {showUnban && (
        <BanConfigModal
          user={user}
          mode="unban"
          onClose={() => setShowUnban(false)}
          onConfirm={({ dimensions }) => {
            dispatch({ type: 'USER_UNBAN', payload: { userId: user.id, dimensions } });
            setShowUnban(false);
            toast(`已按「${dimensions.join('、')}」维度解封 ${user.name}`, 'success');
          }}
        />
      )}
      {showPhoneEdit && (
        <PhoneEditModal
          userLabel={userLabel}
          currentCode={phone.code}
          currentNumber={phone.number}
          onClose={() => setShowPhoneEdit(false)}
          onConfirm={(code, number) => {
            dispatch({ type: 'USER_FIELD_UPDATE', payload: { userId: user.id, field: 'phone', value: `${code} ${number}`.trim() } });
            setShowPhoneEdit(false);
            toast('已修改绑定手机号', 'success');
          }}
        />
      )}
      {edit && (
        <EditFieldModal
          field={edit.field}
          label={edit.label}
          currentValue={edit.value}
          userLabel={userLabel}
          onClose={() => setEdit(null)}
          onConfirm={(field, value) => {
            dispatch({ type: 'USER_FIELD_UPDATE', payload: { userId: user.id, field, value } });
            setEdit(null);
            toast(`已修改${edit.label}`, 'success');
          }}
        />
      )}
    </Panel>
  );
}

const phoneCodeOptions = ['+20', '+90', '+966', '+971', '+974', '+965', '+962', '+212'];

function splitPhone(phone: string) {
  const normalized = phone.trim();
  const matched = normalized.match(/^(\+\d{1,4})\s*(.*)$/);
  if (matched) return { code: matched[1], number: matched[2].trim() };
  return { code: '', number: normalized };
}

function uniqueOptions(currentValue: string, options: string[]) {
  return currentValue && !options.includes(currentValue) ? [currentValue, ...options] : options;
}

function PhoneEditModal({
  userLabel,
  currentCode,
  currentNumber,
  onClose,
  onConfirm,
}: {
  userLabel: string;
  currentCode: string;
  currentNumber: string;
  onClose: () => void;
  onConfirm: (code: string, number: string) => void;
}) {
  const [code, setCode] = useState(currentCode || phoneCodeOptions[0]);
  const [number, setNumber] = useState(currentNumber);
  const normalizedCode = code.trim();
  const normalizedNumber = number.trim();

  return (
    <ModalShell
      title="修改绑定手机"
      subtitle={userLabel}
      onClose={onClose}
      onConfirm={() => onConfirm(normalizedCode, normalizedNumber)}
      confirmText="保存修改"
      confirmDisabled={!normalizedNumber || (normalizedCode === currentCode && normalizedNumber === currentNumber)}
      maxWidth="max-w-md"
    >
      <div className="grid gap-3 sm:grid-cols-[128px_1fr]">
        <Field label="区号">
          <SelectInput value={code} onChange={setCode} options={uniqueOptions(code, phoneCodeOptions)} />
        </Field>
        <Field label="手机号">
          <TextInput value={number} onChange={setNumber} placeholder="请输入手机号" />
        </Field>
      </div>
    </ModalShell>
  );
}

function InfoGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 border-b border-slate-100 pb-2 text-xs font-black text-emerald-700">{title}</h3>
      <div className="grid gap-x-10 gap-y-2 md:grid-cols-2">{children}</div>
    </section>
  );
}

function InfoItem({
  label,
  value,
  badge,
  highlight,
  noWrap,
  onCopy,
  onEdit,
  onDelete,
  onValueClick,
  actionLabel,
  onAction,
}: {
  label: string;
  value: string;
  badge?: boolean;
  highlight?: boolean;
  noWrap?: boolean;
  onCopy?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onValueClick?: () => void;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="grid min-h-9 gap-2 border-b border-slate-100 pb-2 md:grid-cols-[128px_minmax(0,1fr)]">
      <p className="text-sm font-black leading-6 text-slate-400">{label}</p>
      <div className="flex min-w-0 items-start justify-between gap-3">
        {onValueClick ? (
          <button
            type="button"
            onClick={onValueClick}
            className={`min-w-0 text-left text-sm font-black leading-6 text-emerald-700 hover:underline ${noWrap ? 'whitespace-nowrap' : 'break-words'}`}
          >
            {value || '—'}
          </button>
        ) : (
          <div className={`min-w-0 text-sm font-black leading-6 text-slate-900 ${noWrap ? 'whitespace-nowrap' : 'break-words'}`}>
            {badge ? <Badge label={value} /> : <span className={highlight ? 'text-blue-600' : ''}>{value || '—'}</span>}
          </div>
        )}
        <div className="flex shrink-0 items-center gap-0.5">
          {onCopy && <IconMiniButton label={`复制${label}`} icon={Copy} onClick={onCopy} />}
          {onEdit && <IconMiniButton label={`修改${label}`} icon={Edit3} onClick={onEdit} />}
          {onDelete && <IconMiniButton label={`删除${label}`} icon={Trash2} onClick={onDelete} />}
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="ml-1 h-7 rounded border border-emerald-200 bg-white px-2 text-xs font-black text-emerald-700 hover:bg-emerald-50"
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
