import React, { useState } from 'react';
import { Category } from '../types';
import { Plus, Trash2, Edit2, Check, X, Star, Tag, Calendar, Sparkles } from 'lucide-react';

interface AdminCategoriesProps {
  categories: Category[];
  onAddCategory: (name: string, isStarred: boolean) => void;
  onUpdateCategory: (id: string, name?: string, isStarred?: boolean) => void;
  onDeleteCategory: (id: string) => void;
}

export default function AdminCategories({
  categories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
}: AdminCategoriesProps) {
  const [newCatName, setNewCatName] = useState('');
  const [newCatStarred, setNewCatStarred] = useState(false);

  // Editing States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Sort categories so Starred ones appear at the very top, and then alphabetical or chronological order
  const sortedCategories = React.useMemo(() => {
    return [...categories].sort((a, b) => {
      if (a.isStarred && !b.isStarred) return -1;
      if (!a.isStarred && b.isStarred) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [categories]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    onAddCategory(newCatName.trim(), newCatStarred);
    setNewCatName('');
    setNewCatStarred(false);
  };

  const startEditing = (category: Category) => {
    setEditingId(category.id);
    setEditingName(category.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  const saveEditing = (id: string) => {
    if (!editingName.trim()) return;
    onUpdateCategory(id, editingName.trim());
    setEditingId(null);
    setEditingName('');
  };

  return (
    <div id="admin-categories-view" className="flex flex-col gap-6">
      {/* Introduction Card */}
      <div className="bg-gradient-to-br from-rose-950/20 via-neutral-900 to-neutral-950 border border-neutral-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-rose-600/10 border border-rose-500/20 flex items-center justify-center text-rose-500 flex-shrink-0">
            <Tag size={18} />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="font-sans font-black text-white text-base tracking-tight flex items-center gap-2">
              <span>Category Management Engine</span>
              <span className="inline-flex items-center gap-1 text-[10px] bg-rose-950/60 text-rose-300 border border-rose-500/20 px-2 py-0.5 rounded-full font-mono uppercase font-bold tracking-wider">
                <Sparkles size={10} className="text-rose-400" /> Live
              </span>
            </h3>
            <p className="font-sans text-xs text-neutral-400 leading-relaxed max-w-2xl">
              Create and manage all categories here. Starred categories are dynamically pinned to the top of the browse menus. Channels can match category names to be automatically sorted on the front page.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Creation Form Panel */}
        <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-5 shadow-lg flex flex-col gap-4">
          <span className="font-sans font-bold text-xs text-rose-400 block pb-2 border-b border-neutral-800/60">
            Add New Category (নতুন ক্যাটাগরি যোগ করুন)
          </span>

          <form onSubmit={handleAddSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[11px] font-semibold text-neutral-400">Category Name</label>
              <input
                type="text"
                placeholder="e.g. [LIVE] BDIX, Football, Bangla Movies"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-rose-500 focus:outline-none font-sans text-xs text-white"
                required
              />
            </div>

            {/* Star Option Checkbox Card */}
            <div 
              onClick={() => setNewCatStarred(prev => !prev)}
              className={`p-3.5 rounded-xl border cursor-pointer select-none transition-all flex items-center justify-between ${
                newCatStarred
                  ? 'bg-amber-950/25 border-amber-500/40 text-amber-200'
                  : 'bg-neutral-950/40 border-neutral-800 hover:border-neutral-700 text-neutral-400'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Star size={14} fill={newCatStarred ? 'currentColor' : 'none'} className={newCatStarred ? 'text-amber-400' : 'text-neutral-500'} />
                <div className="flex flex-col">
                  <span className="font-sans text-xs font-semibold">Star / Pin Category</span>
                  <span className="font-sans text-[10px] text-neutral-500 leading-none mt-0.5">Pin this category at the top of the listings</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={newCatStarred}
                onChange={() => {}} // handled by div click
                className="sr-only"
              />
              <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                newCatStarred ? 'bg-amber-500 border-amber-600 text-neutral-950' : 'border-neutral-700 bg-neutral-950'
              }`}>
                {newCatStarred && <Check size={10} strokeWidth={3} />}
              </div>
            </div>

            <button
              type="submit"
              className="flex items-center justify-center gap-1.5 w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-sans text-xs font-bold rounded-xl shadow-lg shadow-rose-600/5 active:scale-95 transition-all cursor-pointer mt-1"
            >
              <Plus size={14} />
              <span>Save Category</span>
            </button>
          </form>
        </div>

        {/* Existing Categories Directory List */}
        <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800/80 rounded-2xl p-5 shadow-lg flex flex-col gap-4">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800/60">
            <span className="font-sans font-bold text-xs text-neutral-300">
              Categories Library ({categories.length})
            </span>
            <span className="font-mono text-[10px] text-neutral-500 bg-neutral-950 border border-neutral-800/80 px-2 py-0.5 rounded">
              {categories.filter(c => c.isStarred).length} Starred
            </span>
          </div>

          {sortedCategories.length > 0 ? (
            <div className="flex flex-col gap-2 max-h-[480px] overflow-y-auto pr-1">
              {sortedCategories.map((cat) => {
                const isEditing = editingId === cat.id;

                return (
                  <div
                    key={cat.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      cat.isStarred
                        ? 'bg-amber-950/10 border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.02)]'
                        : 'bg-neutral-950/35 border-neutral-800/80 hover:border-neutral-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-grow mr-4">
                      {/* Star Button */}
                      <button
                        onClick={() => onUpdateCategory(cat.id, undefined, !cat.isStarred)}
                        className={`p-1.5 rounded-lg border transition-all ${
                          cat.isStarred
                            ? 'bg-amber-950/40 border-amber-500/30 text-amber-400 hover:bg-amber-950/60'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-amber-400 hover:border-neutral-700'
                        }`}
                        title={cat.isStarred ? 'Unstar category' : 'Star/Pin category'}
                      >
                        <Star size={13} fill={cat.isStarred ? 'currentColor' : 'none'} />
                      </button>

                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-grow">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="flex-grow px-3 py-1 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500 font-sans"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEditing(cat.id);
                              if (e.key === 'Escape') cancelEditing();
                            }}
                          />
                          <button
                            onClick={() => saveEditing(cat.id)}
                            className="p-1 rounded-md bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 transition-all"
                            title="Save changes"
                          >
                            <Check size={13} />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="p-1 rounded-md bg-rose-600/20 border border-rose-500/30 text-rose-400 hover:bg-rose-600/30 transition-all"
                            title="Cancel editing"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-sans font-bold text-xs text-white leading-normal">
                            {cat.name}
                          </span>
                          <span className="font-sans text-[9px] text-neutral-500 flex items-center gap-1">
                            <Calendar size={10} /> Created: {new Date(cat.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Edit Button */}
                        <button
                          onClick={() => startEditing(cat)}
                          className="p-1.5 rounded-lg border border-neutral-850 bg-neutral-900 text-neutral-400 hover:text-rose-400 hover:border-neutral-700 transition-all"
                          title="Rename category"
                        >
                          <Edit2 size={12} />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete category "${cat.name}"?`)) {
                              onDeleteCategory(cat.id);
                            }
                          }}
                          className="p-1.5 rounded-lg border border-neutral-850 bg-neutral-900 text-neutral-500 hover:text-rose-500 hover:border-rose-500/20 hover:bg-rose-950/25 transition-all"
                          title="Delete category"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center flex flex-col items-center justify-center bg-neutral-950/20 rounded-2xl border border-neutral-800/40">
              <Tag className="text-neutral-600 mb-3" size={28} />
              <h4 className="font-sans font-bold text-xs text-neutral-400">No Categories</h4>
              <p className="font-sans text-[11px] text-neutral-500 mt-1 max-w-xs">
                Your categories library is currently empty. Use the left panel to register new categories instantly.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
