import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { productsApi, skusApi } from '../api';
import { PageHeader, PageBody } from '../components/Layout';
import { Table, Badge, type Column } from '../components/Table';
import { Modal, Button, Field, Input, Select } from '../components/Modal';

export function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [skus, setSkus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'products' | 'skus'>('products');
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [creatingSku, setCreatingSku] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([productsApi.list(), skusApi.list()]);
      setProducts(p); setSkus(s);
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const productCols: Column<any>[] = [
    { key: 'sku', label: 'SPU', render: r => <span className="font-mono">{r.sku}</span> },
    { key: 'name', label: 'Name' },
    { key: 'brand', label: 'Brand' },
    { key: 'category', label: 'Category' },
    { key: 'variants', label: 'Variants', render: r => skus.filter(s => s.productId === r.id).length },
  ];
  const skuCols: Column<any>[] = [
    { key: 'code', label: 'SKU', render: r => <span className="font-mono text-xs">{r.code}</span> },
    { key: 'barcode', label: 'Barcode', render: r => <span className="font-mono text-xs">{r.barcode}</span> },
    { key: 'product', label: 'Product', render: r => products.find(p => p.id === r.productId)?.name ?? '—' },
    { key: 'color', label: 'Color' },
    { key: 'size', label: 'Size' },
    { key: 'storageType', label: 'Storage', render: r => <Badge>{r.storageType}</Badge> },
  ];

  return (
    <>
      <PageHeader title="Products / SKUs"
        subtitle={`${products.length} SPUs · ${skus.length} SKUs`}
        actions={
          <>
            <div className="bg-slate-100 rounded-lg p-0.5 flex">
              {(['products', 'skus'] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-3 py-1 text-xs rounded ${view === v ? 'bg-white shadow' : 'text-slate-600'}`}>
                  {v.toUpperCase()}
                </button>
              ))}
            </div>
            {view === 'products'
              ? <Button onClick={() => setCreatingProduct(true)}><Plus className="inline w-4 h-4 mr-1" />New product</Button>
              : <Button onClick={() => setCreatingSku(true)}><Plus className="inline w-4 h-4 mr-1" />New SKU</Button>}
          </>
        }
      />
      <PageBody>
        {view === 'products'
          ? <Table rows={products} columns={productCols} rowKey={r => r.id} loading={loading} />
          : <Table rows={skus} columns={skuCols} rowKey={r => r.id} loading={loading} />}
      </PageBody>

      {creatingProduct && (
        <ProductModal onClose={() => setCreatingProduct(false)} onSaved={() => { setCreatingProduct(false); load(); }} />
      )}
      {creatingSku && (
        <SkuModal products={products} onClose={() => setCreatingSku(false)} onSaved={() => { setCreatingSku(false); load(); }} />
      )}
    </>
  );
}

function ProductModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [sku, setSku] = useState(''); const [name, setName] = useState('');
  const [brand, setBrand] = useState(''); const [category, setCategory] = useState('');
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try { await productsApi.create({ sku, name, brand, category }); toast.success('Saved'); onSaved(); }
    catch (e: any) { toast.error(e.message); }
    setBusy(false);
  }
  return (
    <Modal open onClose={onClose} title="New product"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={busy}>{busy ? '…' : 'Save'}</Button></>}>
      <div className="space-y-3">
        <Field label="SPU code"><Input value={sku} onChange={e => setSku(e.target.value)} placeholder="PRD-10002" /></Field>
        <Field label="Name"><Input value={name} onChange={e => setName(e.target.value)} /></Field>
        <Field label="Brand"><Input value={brand} onChange={e => setBrand(e.target.value)} /></Field>
        <Field label="Category"><Input value={category} onChange={e => setCategory(e.target.value)} placeholder="T-shirt / Hoodie / Shoes" /></Field>
      </div>
    </Modal>
  );
}

function SkuModal({ products, onClose, onSaved }: { products: any[]; onClose: () => void; onSaved: () => void }) {
  const [productId, setProductId] = useState(products[0]?.id ?? '');
  const [code, setCode] = useState(''); const [barcode, setBarcode] = useState('');
  const [color, setColor] = useState(''); const [size, setSize] = useState('');
  const [weight, setWeight] = useState(0.25);
  const [storageType, setStorageType] = useState('FOLDED');
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try { await skusApi.create({ productId, code, barcode, color, size, weight: Number(weight), storageType }); toast.success('Saved'); onSaved(); }
    catch (e: any) { toast.error(e.message); }
    setBusy(false);
  }
  return (
    <Modal open onClose={onClose} title="New SKU"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={busy}>{busy ? '…' : 'Save'}</Button></>}>
      <div className="space-y-3">
        <Field label="Product"><Select value={productId} onChange={e => setProductId(e.target.value)}>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
        <Field label="SKU code"><Input value={code} onChange={e => setCode(e.target.value)} placeholder="SKU-10002-BLK-M" /></Field>
        <Field label="Barcode"><Input value={barcode} onChange={e => setBarcode(e.target.value)} placeholder="869…" /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Color"><Input value={color} onChange={e => setColor(e.target.value)} /></Field>
          <Field label="Size"><Input value={size} onChange={e => setSize(e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Weight (kg)"><Input type="number" step="0.01" value={weight} onChange={e => setWeight(Number(e.target.value))} /></Field>
          <Field label="Storage"><Select value={storageType} onChange={e => setStorageType(e.target.value)}>
            <option>FOLDED</option><option>HANGING</option><option>SHOES</option><option>ACCESSORIES</option>
          </Select></Field>
        </div>
      </div>
    </Modal>
  );
}
