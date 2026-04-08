'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Minus, Edit2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { formatISK } from '@/lib/utils'
import Image from 'next/image'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface MTULoot {
  loot: string
}

interface MTULootFieldProps {
  value: MTULoot[]
  activityId: string
  onChange: (mtus: MTULoot[]) => void
  mtuValues?: number[]
}

const ITEMS_PER_PAGE = 3

export function MTULootField({ value, activityId, onChange, mtuValues }: MTULootFieldProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempLoot, setTempLoot] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  
  const [isPreviewing, setIsPreviewing] = useState<number | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewTotal, setPreviewTotal] = useState(0);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const totalPages = Math.ceil(value.length / ITEMS_PER_PAGE)
  const paginatedItems = value.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE)

  const saveMTU = async (index: number) => {
    const newMTUs = [...value];
    newMTUs[index] = { loot: tempLoot };
    
    try {
      const res = await fetch(`/api/activities/${activityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { mtuContents: newMTUs } })
      });

      if (res.ok) {
        onChange(newMTUs);
        setEditingIndex(null);
      } else {
        toast.error('Failed to save MTU');
      }
    } catch (e) {
      toast.error('Failed to save MTU');
    }
  };

  const openPreview = async (index: number) => {
    setIsPreviewing(index);
    setIsLoadingPreview(true);
    setPreviewData([]);
    setPreviewTotal(0);
    try {
      const res = await fetch('/api/market/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: value[index].loot })
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewData(data.items);
        setPreviewTotal(data.total);
      }
    } catch(e) {
      console.error(e);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const removeMTU = async (index: number) => {
    const newMTUs = value.filter((_, i) => i !== index);
    try {
      const res = await fetch(`/api/activities/${activityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { mtuContents: newMTUs } })
      });
      if (res.ok) {
        onChange(newMTUs);
      } else {
        toast.error('Failed to remove MTU');
      }
    } catch (e) {
      toast.error('Failed to remove MTU');
    }
  };

  return (
    <div className="space-y-2">
      <div className="max-h-[280px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
        {paginatedItems.map((mtu, idx) => {
          const actualIndex = currentPage * ITEMS_PER_PAGE + idx
          const isEditing = editingIndex === actualIndex
          const lines = (mtu.loot || '').split('\n').filter(l => l.trim())
          const lineCount = lines.length
          const mtuValue = mtuValues?.[actualIndex] || 0

          return (
            <div key={actualIndex} className="space-y-1.5 p-2 rounded bg-zinc-950/50 border border-zinc-800/50 group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="relative h-4 w-4">
                    <Image 
                      src="https://images.evetech.net/Render/33475_512.png"
                      alt="MTU" 
                      fill
                      className="object-contain rounded bg-zinc-900"
                    />
                  </div>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">
                    MTU #{actualIndex + 1} {!isEditing && `(${lineCount} items)`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {mtuValue > 0 && (
                    <span className="text-[10px] font-bold text-blue-400 font-mono">
                      {formatISK(mtuValue)}
                    </span>
                  )}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isEditing && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingIndex(actualIndex);
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
                      onClick={() => removeMTU(actualIndex)}
                      className="h-5 w-5 text-zinc-500 hover:text-red-400"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                  </div>
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
                      onClick={() => saveMTU(actualIndex)}
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
                  className="text-[10px] text-zinc-500 italic truncate cursor-pointer hover:text-zinc-400 group-hover:text-zinc-400"
                  onClick={() => {
                    if (!mtu.loot) {
                      setEditingIndex(actualIndex);
                      setTempLoot(mtu.loot);
                    } else {
                      openPreview(actualIndex);
                    }
                  }}
                >
                  {mtu.loot ? mtu.loot.substring(0, 100) + '... (Click to view details)' : 'Click to paste loot...'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-[10px] text-zinc-500">
          <Button
            variant="ghost"
            size="icon"
            disabled={currentPage === 0}
            onClick={() => setCurrentPage(p => p - 1)}
            className="h-6 w-6"
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <span>{currentPage + 1} / {totalPages}</span>
          <Button
            variant="ghost"
            size="icon"
            disabled={currentPage >= totalPages - 1}
            onClick={() => setCurrentPage(p => p + 1)}
            className="h-6 w-6"
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      )}
      
      <Button
        type="button"
        variant="ghost"
        onClick={async () => {
          const newMTUs = [...value, { loot: '' }];
          const newIndex = value.length;
          try {
            const res = await fetch(`/api/activities/${activityId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ data: { mtuContents: newMTUs } })
            });
            if (res.ok) {
              onChange(newMTUs);
              setTimeout(() => {
                setEditingIndex(newIndex);
                setTempLoot('');
                setCurrentPage(Math.floor(newIndex / ITEMS_PER_PAGE));
              }, 0);
            } else {
              toast.error('Failed to add MTU');
            }
          } catch (e) {
            toast.error('Failed to add MTU');
          }
        }}
        className="w-full h-8 border border-dashed border-zinc-800 hover:border-zinc-700 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <Plus className="h-3 w-3 mr-2" />
        Add MTU & Paste Content
      </Button>

      <Dialog open={isPreviewing !== null} onOpenChange={(open) => !open && setIsPreviewing(null)}>
        <DialogContent className="bg-eve-panel border-eve-border sm:max-w-[450px]">
          <DialogHeader className="border-b border-eve-border/50 pb-3">
            <DialogTitle className="font-mono uppercase tracking-[0.15em] text-gray-300 text-sm flex items-center justify-between">
              <span>MTU #{isPreviewing !== null ? isPreviewing + 1 : ''} Details</span>
              <span className="text-blue-400">{formatISK(previewTotal)}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            {isLoadingPreview ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-eve-accent" />
              </div>
            ) : previewData.length === 0 ? (
              <p className="text-center text-sm text-gray-500 italic py-4">No valid items found.</p>
            ) : (
              <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-[10px] font-mono">
                  <thead className="sticky top-0 bg-eve-panel">
                    <tr className="text-gray-500 uppercase">
                      <th className="text-left py-2 font-medium">Item Name</th>
                      <th className="text-right py-2 font-medium">Qty</th>
                      <th className="text-right py-2 font-medium">Unit Price</th>
                      <th className="text-right py-2 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((item, i) => (
                      <tr key={i} className="border-b border-eve-border/50 text-gray-300 hover:bg-zinc-900/50">
                        <td className="py-1.5 pr-2 truncate max-w-[150px]">{item.name}</td>
                        <td className="py-1.5 text-right px-2 text-gray-400">{item.quantity}</td>
                        <td className="py-1.5 text-right px-2 text-zinc-500">{formatISK(item.unitPrice)}</td>
                        <td className="py-1.5 text-right pl-2 font-medium text-blue-400">{formatISK(item.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}