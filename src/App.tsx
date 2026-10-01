import { useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  UserRound,
} from 'lucide-react';
import characterMasterJson from '../data/master/characters.json';
import equipmentMasterJson from '../data/master/equipment-types.json';
import settingsJson from '../data/master/settings.json';
import { loadStore, saveStore } from './storage';
import type {
  CharacterDefinition,
  CharacterGrowth,
  CharacterMaster,
  EquipmentTypeMaster,
  GameSettings,
  OwnedCharacter,
  UserStore,
} from './types';

const master = characterMasterJson as CharacterMaster;
const equipmentMaster = equipmentMasterJson as EquipmentTypeMaster;
const settings = settingsJson as GameSettings;
const equipmentNameById = new Map(
  equipmentMaster.equipmentTypes.map((item) => [item.id, item.name]),
);

function newOwnedCharacter(definition: CharacterDefinition): OwnedCharacter {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    characterId: definition.id,
    growth: {
      starGrade: definition.initialStarGrade,
      level: null,
      skills: Object.fromEntries(definition.skills.map((skill) => [skill.id, null])),
      wbLevels: Object.fromEntries(definition.wbAttributes.map((attribute) => [attribute.id, 0])),
      bond: null,
      equipment: Object.fromEntries(
        definition.equipmentSlots.map((slot) => [slot.id, { tier: null, level: null }]),
      ),
      uniqueWeapon: null,
      favoriteItem: definition.favoriteItem ? { tier: null } : null,
    },
    createdAt: now,
    updatedAt: now,
  };
}

function getBondCap(starGrade: number | null): number {
  if (starGrade === null) return settings.bondRankCapsByStarGrade['1'];
  return settings.bondRankCapsByStarGrade[String(starGrade)] ?? 10;
}

function getCharacterName(characterId: string): string {
  return master.characters.find((character) => character.id === characterId)?.name ?? '不明な生徒';
}

function parseNumber(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function NumericInput({
  label,
  value,
  min = 1,
  max,
  disabled = false,
  onChange,
}: {
  label: string;
  value: number | null;
  min?: number;
  max?: number;
  disabled?: boolean;
  onChange: (value: number | null) => void;
}) {
  return (
    <label className={`field${disabled ? ' field-disabled' : ''}`}>
      <span className="field-label">{label}</span>
        <input
          aria-label={label}
          type="number"
        inputMode="numeric"
          step={1}
          min={min}
          max={max}
          value={value ?? ''}
          disabled={disabled}
          onChange={(event) => onChange(parseNumber(event.target.value))}
        />
    </label>
  );
}

function Section({ title, detail, children }: { title: string; detail?: string; children: ReactNode }) {
  return (
    <section className="form-section">
      <div className="section-heading">
        <h2>{title}</h2>
        {detail && <p>{detail}</p>}
      </div>
      {children}
    </section>
  );
}

export default function App() {
  const [initialLoad] = useState(() => loadStore(settings.maxSenseiLevel));
  const [store, setStore] = useState<UserStore>(initialLoad.data);
  const [loadError] = useState<string | null>(initialLoad.error);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [senseiDraft, setSenseiDraft] = useState(String(initialLoad.data.account.senseiLevel));
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'list' | 'picker' | 'edit'>('list');
  const [form, setForm] = useState<OwnedCharacter | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const persist = (next: UserStore): boolean => {
    if (loadError) return false;
    try {
      saveStore(next);
      setStore(next);
      setStorageError(null);
      return true;
    } catch {
      setStorageError('保存に失敗しました。入力内容は保持しています。空き容量やサイトデータ設定を確認して再試行してください。');
      return false;
    }
  };

  const ownedIds = new Set(store.characters.map((item) => item.characterId));
  const filteredCharacters = store.characters
    .map((item) => ({ record: item, definition: master.characters.find((character) => character.id === item.characterId) }))
    .filter((item) => item.definition && item.definition.name.toLocaleLowerCase('ja').includes(query.trim().toLocaleLowerCase('ja')))
    .sort((left, right) => left.definition!.name.localeCompare(right.definition!.name, 'ja'));
  const availableCharacters = master.characters
    .filter((character) => !ownedIds.has(character.id))
    .filter((character) => character.name.toLocaleLowerCase('ja').includes(query.trim().toLocaleLowerCase('ja')))
    .sort((left, right) => left.name.localeCompare(right.name, 'ja'));

  const updateGrowth = <K extends keyof CharacterGrowth>(key: K, value: CharacterGrowth[K]) => {
    setForm((current) => current ? {
      ...current,
      growth: { ...current.growth, [key]: value },
    } : current);
  };

  const commitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form) return;

    const definition = master.characters.find((character) => character.id === form.characterId);
    if (!definition) {
      setFormError('キャラクター定義が見つかりません。マスターデータを確認してください。');
      return;
    }

    const growth = form.growth;
    const levelCap = Math.min(settings.maxSenseiLevel, store.account.senseiLevel);
    if (growth.level !== null && (growth.level < 1 || growth.level > levelCap)) {
      setFormError(`キャラクターLvは1〜${levelCap}で入力してください。`);
      return;
    }
    if (growth.starGrade === null || growth.starGrade < 1 || growth.starGrade > settings.maxCharacterStarGrade) {
      setFormError('レアリティは★1〜5で入力してください。');
      return;
    }
    if (growth.bond !== null && (growth.bond < 1 || growth.bond > getBondCap(growth.starGrade))) {
      setFormError(`絆ランクは1〜${getBondCap(growth.starGrade)}で入力してください。`);
      return;
    }
    for (const attribute of definition.wbAttributes) {
      const value = growth.wbLevels[attribute.id];
      if (value !== null && (value < 0 || value > attribute.maxLevel)) {
        setFormError(`${attribute.name}は0〜${attribute.maxLevel}で入力してください。`);
        return;
      }
    }
    for (const skill of definition.skills) {
      const value = growth.skills[skill.id];
      if (value !== null && (value < 1 || value > skill.maxLevel)) {
        setFormError(`${skill.name}は1〜${skill.maxLevel}で入力してください。`);
        return;
      }
    }
    if (growth.uniqueWeapon && growth.starGrade < 5) {
      setFormError('固有武器は★5で解放されます。レアリティを確認してください。');
      return;
    }
    if (growth.favoriteItem?.tier !== null && growth.favoriteItem?.tier !== undefined) {
      if ((growth.bond ?? 0) < settings.favoriteItemRequirements.equipBondRank) {
        setFormError(`愛用品は絆${settings.favoriteItemRequirements.equipBondRank}以上で装備できます。`);
        return;
      }
      if (growth.favoriteItem.tier === 2 && (growth.bond ?? 0) < settings.favoriteItemRequirements.tier2BondRank) {
        setFormError(`愛用品T2は絆${settings.favoriteItemRequirements.tier2BondRank}以上で強化できます。`);
        return;
      }
    }

    const updated: OwnedCharacter = { ...form, updatedAt: new Date().toISOString() };
    const exists = store.characters.some((item) => item.id === updated.id);
    const characters = exists
      ? store.characters.map((item) => item.id === updated.id ? updated : item)
      : [...store.characters, updated];
    if (persist({ ...store, characters })) {
      setForm(null);
      setFormError(null);
      setQuery('');
      setView('list');
    }
  };

  const removeCharacter = () => {
    if (!form) return;
    const name = getCharacterName(form.characterId);
    if (!window.confirm(`${name}の育成記録を削除しますか？`)) return;
    if (persist({ ...store, characters: store.characters.filter((item) => item.id !== form.id) })) {
      setForm(null);
      setView('list');
    }
  };

  const saveSenseiLevel = () => {
    const level = parseNumber(senseiDraft);
    if (level === null || level < 1 || level > settings.maxSenseiLevel) {
      setAccountError(`先生Lvは1〜${settings.maxSenseiLevel}で入力してください。`);
      return;
    }
    const highestCharacterLevel = Math.max(0, ...store.characters.map((item) => item.growth.level ?? 0));
    if (level < highestCharacterLevel) {
      setAccountError(`登録済み生徒の最高Lv（${highestCharacterLevel}）より低い値には設定できません。`);
      return;
    }
    setAccountError(null);
    persist({ ...store, account: { senseiLevel: level } });
  };

  const openEditor = (record: OwnedCharacter) => {
    setForm(structuredClone(record));
    setFormError(null);
    setView('edit');
  };

  const startNewCharacter = (definition: CharacterDefinition) => {
    setForm(newOwnedCharacter(definition));
    setFormError(null);
    setQuery('');
    setView('edit');
  };

  const changeEquipment = (slotId: string, field: 'tier' | 'level', value: number | null) => {
    if (!form) return;
    const oldValue = form.growth.equipment[slotId] ?? { tier: null, level: null };
    updateGrowth('equipment', {
      ...form.growth.equipment,
      [slotId]: { ...oldValue, [field]: value },
    });
  };

  const changeWeapon = (field: 'starGrade' | 'level', value: number | null) => {
    if (!form) return;
    const weapon = form.growth.uniqueWeapon ?? { starGrade: null, level: null };
    updateGrowth('uniqueWeapon', { ...weapon, [field]: value });
  };

  if (view === 'edit' && form) {
    const definition = master.characters.find((character) => character.id === form.characterId);
    if (!definition) return <main className="fatal-state">マスターデータにキャラクターがありません。</main>;
    const characterLevel = form.growth.level ?? 0;
    const releaseReady = characterLevel >= settings.abilityReleaseRequirement.characterLevel
      && (form.growth.starGrade ?? 0) >= settings.abilityReleaseRequirement.starGrade;
    const bondCap = getBondCap(form.growth.starGrade);
    const levelCap = Math.min(settings.maxSenseiLevel, store.account.senseiLevel);

    return (
      <main className="app-shell">
        <header className="topbar compact-topbar">
          <button className="icon-button back-button" type="button" aria-label="一覧へ戻る" onClick={() => { setView('list'); setForm(null); }}>
            <ArrowLeft size={19} />
          </button>
          <div className="brand-mark" aria-hidden="true">SN</div>
          <div className="brand-copy"><span>STUDENT NOTES</span><strong>生徒育成ノート</strong></div>
          <div className="topbar-spacer" />
          {store.characters.some((item) => item.id === form.id) && (
            <button className="icon-button danger-icon" type="button" aria-label="記録を削除" title="記録を削除" onClick={removeCharacter}>
              <Trash2 size={18} />
            </button>
          )}
        </header>

        {(loadError || storageError) && <div className="notice notice-error" role="alert"><ShieldAlert size={17} />{loadError ?? storageError}{loadError && ' 保存データを保護するため、変更を一時停止しています。'}</div>}
        <form className="editor-layout" onSubmit={commitForm}>
          <div className="editor-heading">
            <div>
              <p className="eyebrow">STUDENT PROFILE</p>
              <h1>{definition.name}</h1>
              <p className="subtitle">現在の育成状況を記録</p>
            </div>
            <div className="editor-actions desktop-actions">
              <button className="button button-secondary" type="button" onClick={() => { setView('list'); setForm(null); }}>キャンセル</button>
              <button className="button button-primary" type="submit" disabled={Boolean(loadError)}><Check size={16} />保存</button>
            </div>
          </div>

          {formError && <div className="notice notice-error" role="alert"><ShieldAlert size={17} />{formError}</div>}

          <Section title="基本" detail={`初期レアリティ ★${definition.initialStarGrade} ・ 絆上限 ${bondCap}`}>
            <div className="field-grid field-grid-three">
              <label className="field">
                <span className="field-label">レアリティ</span>
                <select value={form.growth.starGrade ?? ''} onChange={(event) => updateGrowth('starGrade', parseNumber(event.target.value))}>
                  {[1, 2, 3, 4, 5].map((star) => <option key={star} value={star}>★{star}</option>)}
                </select>
              </label>
              <NumericInput label="キャラクターLv" value={form.growth.level} max={levelCap} onChange={(value) => updateGrowth('level', value)} />
              <NumericInput label="絆ランク" value={form.growth.bond} max={bondCap} onChange={(value) => updateGrowth('bond', value)} />
            </div>
          </Section>

          <Section title="スキル" detail="マスター定義されたスキルごとに記録">
            <div className="skill-list">
              {definition.skills.map((skill) => (
                <div className="skill-row" key={skill.id}>
                  <span className={`skill-type skill-${skill.type}`}>{skill.type.toUpperCase()}</span>
                  <span className="skill-name">{skill.name}</span>
                  <NumericInput
                    label={`${skill.name} Lv`}
                    value={form.growth.skills[skill.id] ?? null}
                    max={skill.maxLevel}
                    onChange={(value) => updateGrowth('skills', { ...form.growth.skills, [skill.id]: value })}
                  />
                  <span className="input-cap">/ {skill.maxLevel}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="能力解放" detail={`利用条件: キャラクターLv${settings.abilityReleaseRequirement.characterLevel}・★${settings.abilityReleaseRequirement.starGrade}`}>
            {!releaseReady && <p className="inline-note">条件未達のため入力できません。記録済みの値は保持されます。</p>}
            <div className="wb-grid">
              {definition.wbAttributes.map((attribute, index) => (
                <div className="wb-field" key={attribute.id}>
                  <span className={`wb-index wb-index-${index + 1}`}>0{index + 1}</span>
                  <NumericInput
                    label={attribute.name}
                    value={form.growth.wbLevels[attribute.id] ?? null}
                    min={0}
                    max={attribute.maxLevel}
                    disabled={!releaseReady}
                    onChange={(value) => updateGrowth('wbLevels', { ...form.growth.wbLevels, [attribute.id]: value })}
                  />
                  <span className="input-cap">/ {attribute.maxLevel}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="装備" detail="キャラクターLvに応じて枠が解放されます">
            <div className="equipment-grid">
              {definition.equipmentSlots.map((slot, index) => {
                const unlocked = characterLevel >= slot.unlockedAtLevel;
                const current = form.growth.equipment[slot.id] ?? { tier: null, level: null };
                return (
                  <div className={`equipment-row${unlocked ? '' : ' equipment-locked'}`} key={slot.id}>
                    <div className="equipment-label"><span className="equipment-number">0{index + 1}</span><strong>{equipmentNameById.get(slot.equipmentTypeId) ?? slot.equipmentTypeId}</strong></div>
                    <span className="unlock-status">{unlocked ? '解放済み' : `Lv${slot.unlockedAtLevel}で解放`}</span>
                    <NumericInput label={`${equipmentNameById.get(slot.equipmentTypeId) ?? '装備'} Tier`} value={current.tier} disabled={!unlocked} onChange={(value) => changeEquipment(slot.id, 'tier', value)} />
                    <NumericInput label={`${equipmentNameById.get(slot.equipmentTypeId) ?? '装備'} Lv`} value={current.level} disabled={!unlocked} onChange={(value) => changeEquipment(slot.id, 'level', value)} />
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title="固有武器・愛用品">
            <div className="field-grid field-grid-two">
              <div className="progress-block">
                <div className="progress-title"><strong>固有武器</strong><span>{form.growth.starGrade && form.growth.starGrade >= 5 ? '解放済み' : '★5で解放'}</span></div>
                <div className="paired-inputs">
                  <NumericInput label="固有武器★" value={form.growth.uniqueWeapon?.starGrade ?? null} disabled={!definition.hasUniqueWeapon || (form.growth.starGrade ?? 0) < 5} onChange={(value) => changeWeapon('starGrade', value)} />
                  <NumericInput label="固有武器Lv" value={form.growth.uniqueWeapon?.level ?? null} disabled={!definition.hasUniqueWeapon || (form.growth.starGrade ?? 0) < 5} onChange={(value) => changeWeapon('level', value)} />
                </div>
              </div>
              {definition.favoriteItem && (
                <div className="progress-block">
                  <div className="progress-title"><strong>{definition.favoriteItem.name}</strong><span>愛用品</span></div>
                  <label className="field">
                    <span className="field-label">強化段階</span>
                    <select value={form.growth.favoriteItem?.tier ?? ''} onChange={(event) => updateGrowth('favoriteItem', event.target.value ? { tier: Number(event.target.value) } : null)}>
                      <option value="">未所持</option>
                      <option value="1" disabled={(form.growth.bond ?? 0) < settings.favoriteItemRequirements.equipBondRank}>T1</option>
                      <option value="2" disabled={(form.growth.bond ?? 0) < settings.favoriteItemRequirements.tier2BondRank}>T2</option>
                    </select>
                  </label>
                  <p className="inline-note">装備は絆{settings.favoriteItemRequirements.equipBondRank}、T2強化は絆{settings.favoriteItemRequirements.tier2BondRank}が条件です。</p>
                </div>
              )}
            </div>
          </Section>

          <div className="editor-actions mobile-actions">
            <button className="button button-secondary" type="button" onClick={() => { setView('list'); setForm(null); }}>キャンセル</button>
            <button className="button button-primary" type="submit" disabled={Boolean(loadError)}><Check size={16} />保存</button>
          </div>
        </form>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark" aria-hidden="true">SN</div>
        <div className="brand-copy"><span>STUDENT NOTES</span><strong>生徒育成ノート</strong></div>
        <div className="topbar-spacer" />
        <label className="sensei-control">
          <span>先生Lv</span>
          <input aria-label="先生レベル" type="number" min="1" max={settings.maxSenseiLevel} step="1" value={senseiDraft} onChange={(event) => setSenseiDraft(event.target.value)} onBlur={saveSenseiLevel} onKeyDown={(event) => { if (event.key === 'Enter') saveSenseiLevel(); }} />
          <span className="sensei-cap">/ {settings.maxSenseiLevel}</span>
        </label>
      </header>

      {(loadError || storageError || accountError) && <div className="notice notice-error" role="alert"><ShieldAlert size={17} />{loadError ?? storageError ?? accountError}{loadError && ' 保存データを保護するため、変更を一時停止しています。'}</div>}

      {view === 'picker' ? (
        <section className="list-view">
          <div className="page-heading">
            <div>
              <p className="eyebrow">YOUR ROSTER</p>
              <h1>生徒を追加</h1>
              <p className="subtitle">マスターに登録済みの生徒から選択</p>
            </div>
            <button className="button button-secondary" type="button" onClick={() => { setView('list'); setQuery(''); }}><ArrowLeft size={16} />戻る</button>
          </div>
          <div className="search-row">
            <Search size={18} aria-hidden="true" />
            <input autoFocus aria-label="キャラクター名で検索" placeholder="生徒名で検索" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <div className="picker-list">
            {availableCharacters.map((character) => (
              <button className="picker-row" type="button" key={character.id} onClick={() => startNewCharacter(character)}>
                <span className="avatar-placeholder"><UserRound size={20} /></span>
                <span className="picker-name">{character.name}<small>★{character.initialStarGrade} ・ {character.id}</small></span>
                <Plus size={19} />
              </button>
            ))}
            {availableCharacters.length === 0 && <div className="empty-state compact-empty"><strong>該当する生徒がいません</strong><span>検索語を変えてください。</span></div>}
          </div>
        </section>
      ) : (
        <section className="list-view">
          <div className="page-heading">
            <div>
              <p className="eyebrow">YOUR ROSTER <span>·</span> {store.characters.length} STUDENTS</p>
              <h1>所持生徒</h1>
              <p className="subtitle">現在の育成状況を一覧で管理</p>
            </div>
            <button className="button button-primary add-button" type="button" disabled={Boolean(loadError)} onClick={() => { setQuery(''); setView('picker'); }}><Plus size={17} />生徒を追加</button>
          </div>
          <div className="toolbar">
            <div className="search-row">
              <Search size={18} aria-hidden="true" />
              <input aria-label="登録済み生徒を検索" placeholder="登録済み生徒を検索" value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
            <span className="master-stamp">マスター確認 {master.verifiedAt}</span>
          </div>
          {filteredCharacters.length > 0 ? (
            <div className="roster-list">
              {filteredCharacters.map(({ record, definition }) => {
                if (!definition) return null;
                const growth = record.growth;
                const wbValues = definition.wbAttributes.map((attribute) => growth.wbLevels[attribute.id] ?? null);
                const skillValues = definition.skills.map((skill) => growth.skills[skill.id] ?? null);
                return (
                  <button className="roster-row" type="button" key={record.id} onClick={() => openEditor(record)}>
                    <span className="avatar-placeholder roster-avatar"><UserRound size={22} /></span>
                    <span className="roster-main">
                      <span className="roster-name">{definition.name}<span className="star-chip">★{growth.starGrade ?? '—'}</span></span>
                      <span className="roster-meta">Lv {growth.level ?? '未入力'} <i /> 絆 {growth.bond ?? '未入力'}</span>
                    </span>
                    <span className="roster-progress">
                      <span><b>SKILL</b>{skillValues.map((value) => value ?? '–').join(' / ')}</span>
                      <span><b>WB</b>{wbValues.map((value) => value ?? '–').join(' / ')}</span>
                    </span>
                    <ChevronRight className="row-chevron" size={19} />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-mark"><UserRound size={25} /></div>
              <strong>{store.characters.length === 0 ? 'まだ生徒が登録されていません' : '検索結果がありません'}</strong>
              <span>{store.characters.length === 0 ? '所持生徒を追加して育成状況を記録しましょう。' : '検索語を変えてお試しください。'}</span>
              {store.characters.length === 0 && <button className="button button-primary" type="button" disabled={Boolean(loadError)} onClick={() => setView('picker')}><Plus size={17} />生徒を追加</button>}
            </div>
          )}
          <footer className="page-footer"><span>保存先: このブラウザー</span><span>ゲームデータ: {master.region}マスター</span></footer>
        </section>
      )}
    </main>
  );
}
