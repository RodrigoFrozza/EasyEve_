'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Package, Save, X, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatISK } from '@/lib/utils'

interface MTUItem {
  name: string
  quantity: number
  value?: number
}

interface MTUInputModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (items: MTUItem[]) => void
  existingItems?: MTUItem[]
  mtuValues?: number[]
}

export function MTUInputModal({ open, onOpenChange, onSave, existingItems = [], mtuValues = [] }: MTUInputModalProps) {
  const [items, setItems] = useState<MTUItem[]>(existingItems)
  const [rawInput, setRawInput] = useState('')
  const [mode, setMode] = useState<'raw' | 'manual'>('raw')

  const handleParseRawInput = () => {
    if (!rawInput.trim()) {
      toast.error('Please paste MTU content')
      return
    }

    const lines = rawInput.split('\n').filter(line => line.trim())
    const parsed: MTUItem[] = []

    for (const line of lines) {
      const match = line.match(/(\d+)\s+x\s+(.+)/i)
      if (match) {
        parsed.push({
          quantity: parseInt(match[1]),
          name: match[2].trim(),
          value: 0
        })
      } else {
        const parts = line.trim().split(/\s+/)
        if (parts.length >= 2) {
          const qty = parseInt(parts[0])
          if (!isNaN(qty)) {
            parsed.push({
              quantity: qty,
              name: parts.slice(1).join(' '),
              value: 0
            })
          }
        }
      }
    }

    if (parsed.length === 0) {
      toast.error('Could not parse MTU content. Format: "1 x Item Name" per line')
      return
    }

    setItems(parsed)
    toast.success(`Parsed ${parsed.length} items`)
  }

  const handleManualAdd = () => {
    setItems([...items, { name: '', quantity: 1, value: 0 }])
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleItemChange = (index: number, field: keyof MTUItem, value: string | number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const handleSave = () => {
    if (items.length === 0) {
      toast.error('Add at least one item')
      return
    }
    onSave(items)
    onOpenChange(false)
    setRawInput('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-zinc-950 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-black uppercase tracking-wider">
            <Package className="h-5 w-5 text-blue-400" />
            Add MTU Contents
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-sm">
            Paste or manually add items from your Mobile Tractor Unit
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setMode('raw')}
              className={`flex-1 py-2 px-4 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                mode === 'raw' 
                  ? 'bg-blue-500 text-black' 
                  : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Paste Raw
            </button>
            <button
              onClick={() => setMode('manual')}
              className={`flex-1 py-2 px-4 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                mode === 'manual' 
                  ? 'bg-blue-500 text-black' 
                  : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Manual Entry
            </button>
          </div>

          {mode === 'raw' ? (
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs uppercase font-black tracking-wider">
                Paste from clipboard
              </Label>
              <Textarea
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder="1 x Kinetic Armor plating&#10;5 x Rookie ship&#10;10 x Shrouded Weapon"
                className="min-h-[150px] bg-zinc-900/50 border-zinc-800 text-zinc-100 font-mono text-sm resize-none focus:border-blue-500"
              />
              <Button 
                onClick={handleParseRawInput}
                className="w-full bg-blue-500 hover:bg-blue-600 text-black font-black uppercase text-xs tracking-wider"
              >
                <Plus className="h-4 w-4 mr-2" />
                Parse Items
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-2">
                <Label className="text-zinc-400 text-xs uppercase font-black tracking-wider">
                  Items ({items.length})
                </Label>
                <Button 
                  onClick={handleManualAdd}
                  variant="outline"
                  size="sm"
                  className="h-8 bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Item
                </Button>
              </div>
              
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                {items.map((item, index) => (
                  <div key={index} className="flex gap-2 items-center bg-zinc-900/50 p-2 rounded-lg border border-zinc-800/50">
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                      className="w-16 h-8 bg-zinc-950 border-zinc-800 text-center font-mono text-sm"
                    />
                    <Input
                      value={item.name}
                      onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                      placeholder="Item name"
                      className="flex-1 h-8 bg-zinc-950 border-zinc-800 text-sm"
                    />
                    <Button
                      onClick={() => handleRemoveItem(index)}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-zinc-500 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {items.length === 0 && (
                  <p className="text-center text-zinc-500 text-sm py-4">No items added yet</p>
                )}
              </div>
            </div>
          )}

          {items.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
              <p className="text-xs text-zinc-500 uppercase font-black tracking-wider mb-2">
                Preview ({items.length} items)
              </p>
              <div className="space-y-1 max-h-[100px] overflow-y-auto">
                {items.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-zinc-300 truncate">{item.name}</span>
                    <span className="text-zinc-500 font-mono">x{item.quantity}</span>
                  </div>
                ))}
                {items.length > 5 && (
                  <p className="text-zinc-500 text-xs">+{items.length - 5} more items...</p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={items.length === 0}
            className="bg-blue-500 hover:bg-blue-600 text-black font-black uppercase text-xs tracking-wider"
          >
            <Save className="h-4 w-4 mr-2" />
            Save MTU Items
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}