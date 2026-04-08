'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Minus, Edit2 } from 'lucide-react'

interface MTULoot {
  loot: string
}

interface MTULootFieldProps {
  value: MTULoot[]
  activityId: string
  onChange: (mtus: MTULoot[]) => void
}

export function MTULootField({ value, activityId, onChange }: MTULootFieldProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempLoot, setTempLoot] = useState('');

  const saveMTU = async (index: number) => {
    const newMTUs = [...value];
    newMTUs[index] = { loot: tempLoot };
    
    const res = await fetch(`/api/activities/${activityId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { mtuContents: newMTUs } })
    });

    if (res.ok) {
      onChange(newMTUs);
      setEditingIndex(null);
    }
  };

  const removeMTU = async (index: number) => {
    const newMTUs = value.filter((_, i) => i !== index);
    const res = await fetch(`/api/activities/${activityId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { mtuContents: newMTUs } })
    });
    if (res.ok) onChange(newMTUs);
  };

  return (
    <div className="space-y-2">
      <div className="max-h-[300px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
        {value.map((mtu, index) => {
          const isEditing = editingIndex === index;
          const lines = (mtu.loot || '').split('\n').filter(l => l.trim())
          const lineCount = lines.length;

          return (
            <div key={index} className="space-y-1.5 p-2 rounded bg-zinc-950/50 border border-zinc-800/50 group">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">
                  MTU UNIT #{index + 1} {!isEditing && `(${lineCount} items)`}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!isEditing && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingIndex(index);
                        setTempLoot(mtu.loot);
                      }}
                      className="h-5 w-5 text-zinc-500 hover:text-zinc-100"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMTU(index)}
                    className="h-5 w-5 text-zinc-500 hover:text-red-400"
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
                    placeholder="Paste MTU inventory here..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-[11px] text-zinc-300 min-h-[80px] font-mono resize-none focus:ring-1 focus:ring-zinc-700 outline-none"
                    rows={4}
                  />
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className="h-7 text-[10px] flex-1 bg-zinc-100 text-zinc-950 hover:bg-white"
                      onClick={() => saveMTU(index)}
                    >
                      Save Loot Content
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-7 text-[10px] text-zinc-500"
                      onClick={() => setEditingIndex(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div 
                  className="text-[10px] text-zinc-500 italic truncate cursor-pointer hover:text-zinc-400"
                  onClick={() => {
                    setEditingIndex(index);
                    setTempLoot(mtu.loot);
                  }}
                >
                  {mtu.loot ? mtu.loot.substring(0, 100) + '...' : 'Click to paste loot...'}
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
        className="w-full h-8 border border-dashed border-zinc-800 hover:border-zinc-700 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <Plus className="h-3 w-3 mr-2" />
        Register New MTU
      </Button>
    </div>
  )
}
