'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Minus, Edit2, Wrench, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { formatISK } from '@/lib/utils'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface SalvageItem {
  loot: string
}

interface SalvageFieldProps {
  value: SalvageItem[]
  activityId: string
  onChange: (salvage: SalvageItem[]) => void
}

const ITEMS_PER_PAGE = 3

export function SalvageField({ value, activityId, onChange }: SalvageFieldProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempLoot, setTempLoot] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  
  const [isPreviewing, setIsPreviewing] = useState<number | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewTotal, setPreviewTotal] = useState(0);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const totalPages = Math.ceil(value.length / ITEMS_PER_PAGE)
  const paginatedItems = value.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE)

  const saveSalvage = async (index: number) => {
    const newSalvage = [...value];
    newSalvage[index] = { loot: tempLoot };
    
    try {
      const res = await fetch(`/api/activities/${activityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { salvageContents: newSalvage } })
      });

      if (res.ok) {
        onChange(newSalvage);
        setEditingIndex(null);
      } else {
        toast.error('Failed to save Salvage');
      }
    } catch (e) {
      toast.error('Failed to save Salvage');
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

  const removeSalvage = async (index: number) => {
    const newSalvage = value.filter((_, i) => i !== index);
    try {
      const res = await fetch(`/api/activities/${activityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { salvageContents: newSalvage } })
      });
      if (res.ok) {
        onChange(newSalvage);
      } else {
        toast.error('Failed to remove Salvage');
      }
    } catch (e) {
      toast.error('Failed to remove Salvage');
    }
  };

  return (
    <div className="space-y-2">
      <div className="max-h-[200px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
        {paginatedItems.map((item, idx) => {
          const actualIndex = currentPage * ITEMS_PER_PAGE + idx
          const isEditing = editingIndex === actualIndex
          const lines = (item.loot || '').split('\n').filter(l => l.trim())
          const lineCount = lines.length

          return (
            <div key={actualIndex} className="space-y-1.5 p-2 rounded bg-orange-950/20 border border-orange-900/30 group">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-orange-500/70 font-bold uppercase tracking-tighter flex items-center gap-1.5">
                  <Wrench className="h-3 w-3 text-orange-400" />
                  Salvage Unit #{actualIndex + 1} {!isEditing && `(${lineCount} items)`}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!isEditing && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingIndex(actualIndex);
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
                    onClick={() => removeSalvage(actualIndex)}
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
                      onClick={() => saveSalvage(actualIndex)}
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
                  className="text-[10px] text-orange-500/50 italic truncate cursor-pointer hover:text-orange-400/70 group-hover:text-orange-400/70"
                  onClick={() => {
                    if (!item.loot) {
                      setEditingIndex(actualIndex);
                      setTempLoot(item.loot);
                    } else {
                      openPreview(actualIndex);
                    }
                  }}
                >
                  {item.loot ? item.loot.substring(0, 100) + '... (Click to view details)' : 'Click to paste salvage...'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-[10px] text-orange-500/70">
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
          const newSalvage = [...value, { loot: '' }];
          try {
            const res = await fetch(`/api/activities/${activityId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ data: { salvageContents: newSalvage } })
            });
            if (res.ok) {
              onChange(newSalvage);
              setEditingIndex(value.length);
              setCurrentPage(Math.floor(value.length / ITEMS_PER_PAGE));
              setTempLoot('');
            } else {
              toast.error('Failed to add Salvage');
            }
          } catch (e) {
            toast.error('Failed to add Salvage');
          }
        }}
        className="w-full h-8 border border-dashed border-orange-900/50 hover:border-orange-700/50 text-[10px] text-orange-500/70 hover:text-orange-400 transition-colors"
      >
        <Plus className="h-3 w-3 mr-2" />
        Register New Salvage
      </Button>

      <Dialog open={isPreviewing !== null} onOpenChange={(open) => !open && setIsPreviewing(null)}>
        <DialogContent className="bg-eve-panel border-eve-border sm:max-w-[450px]">
          <DialogHeader className="border-b border-eve-border/50 pb-3">
            <DialogTitle className="font-mono uppercase tracking-[0.15em] text-gray-300 text-sm flex items-center justify-between">
              <span>Salvage Unit #{isPreviewing !== null ? isPreviewing + 1 : ''} Details</span>
              <span className="text-orange-400">{formatISK(previewTotal)}</span>
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
                    {previewData.map((dataItem, i) => (
                      <tr key={i} className="border-b border-eve-border/50 text-gray-300 hover:bg-zinc-900/50">
                        <td className="py-1.5 pr-2 truncate max-w-[150px]">{dataItem.name}</td>
                        <td className="py-1.5 text-right px-2 text-gray-400">{dataItem.quantity}</td>
                        <td className="py-1.5 text-right px-2 text-zinc-500">{formatISK(dataItem.unitPrice)}</td>
                        <td className="py-1.5 text-right pl-2 font-medium text-orange-400">{formatISK(dataItem.totalPrice)}</td>
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