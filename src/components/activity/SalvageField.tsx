'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Minus, Edit2, Wrench } from 'lucide-react'

interface SalvageItem {
  loot: string
}

interface SalvageFieldProps {
  value: SalvageItem[]
  activityId: string
  onChange: (salvage: SalvageItem[]) => void
}

export function SalvageField({ value, activityId, onChange }: SalvageFieldProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempLoot, setTempLoot] = useState('');

  const saveSalvage = async (index: number) => {
    const newSalvage = [...value];
    newSalvage[index] = { loot: tempLoot };
    
    const res = await fetch(`/api/activities/${activityId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { salvageContents: newSalvage } })
    });

    if (res.ok) {
      onChange(newSalvage);
      setEditingIndex(null);
    }
  };

  const removeSalvage = async (index: number) => {
    const newSalvage = value.filter((_, i) => i !== index);
    const res = await fetch(`/api/activities/${activityId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { salvageContents: newSalvage } })
    });
    if (res.ok) onChange(newSalvage);
  };

  return (
    <div className="space-y-2">
      <div className="max-h-[200px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
        {value.map((item, index) => {
          const isEditing = editingIndex === index;
          const lines = (item.loot || '').split('\n').filter(l => l.trim())
          const lineCount = lines.length;

          return (
            <div key={index} className="space-y-1.5 p-2 rounded bg-orange-950/20 border border-orange-900/30 group">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-orange-500/70 font-bold uppercase tracking-tighter flex items-center gap-1.5">
                  <Wrench className="h-3 w-3" />
                  Salvage Unit #{index + 1} {!isEditing && `(${lineCount} items)`}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!isEditing && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingIndex(index);
                        setTempLoot(item.loot);
                      }}
                      className="h-5 w-5 text-orange-500/50 hover:text-orange-400"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSalvage(index)}
                    className="h-5 w-5 text-orange-500/50 hover:text-red-400"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={tempLoot}
                    onChange={(e) => setTempLoot(e.target.value)}
                    placeholder="Paste salvage inventory here..."
                    className="w-full bg-zinc-950 border border-orange-900/50 rounded p-2 text-[11px] text-orange-100/80 min-h-[80px] font-mono resize-none focus:ring-1 focus:ring-orange-500/50 outline-none placeholder:text-orange-500/30"
                    rows={4}
                  />
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className="h-7 text-[10px] flex-1 bg-orange-600 text-white hover:bg-orange-500"
                      onClick={() => saveSalvage(index)}
                    >
                      Save Salvage
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-7 text-[10px] text-orange-500/70"
                      onClick={() => setEditingIndex(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div 
                  className="text-[10px] text-orange-500/50 italic truncate cursor-pointer hover:text-orange-400/70"
                  onClick={() => {
                    setEditingIndex(index);
                    setTempLoot(item.loot);
                  }}
                >
                  {item.loot ? item.loot.substring(0, 100) + '...' : 'Click to paste salvage...'}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <Button
        type="button"
        variant="ghost"
        onClick={() => {
          onChange([...value, { loot: '' }]);
          setEditingIndex(value.length);
          setTempLoot('');
        }}
        className="w-full h-8 border border-dashed border-orange-900/50 hover:border-orange-700/50 text-[10px] text-orange-500/70 hover:text-orange-400 transition-colors"
      >
        <Plus className="h-3 w-3 mr-2" />
        Register New Salvage
      </Button>
    </div>
  )
}