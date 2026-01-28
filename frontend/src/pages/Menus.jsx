import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Plus, UtensilsCrossed, DollarSign, Edit, Trash2, Leaf, AlertTriangle } from 'lucide-react';

export default function Menus() {
  const [packages, setPackages] = useState([]);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [packageCategories, setPackageCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('packages');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('package');
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({});
  const [error, setError] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [packagesRes, itemsRes, categoriesRes, pkgCategoriesRes] = await Promise.all([
        api.get('/menus/packages'),
        api.get('/menus/items'),
        api.get('/menus/options/categories'),
        api.get('/menus/options/package-categories')
      ]);
      setPackages(packagesRes.data);
      setItems(itemsRes.data);
      setCategories(categoriesRes.data);
      setPackageCategories(pkgCategoriesRes.data);
    } catch (error) {
      console.error('Failed to load menus:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (type, item = null) => {
    setModalType(type);
    setEditing(item);
    setError('');
    if (type === 'package') {
      setFormData(item ? {
        name: item.name,
        description: item.description || '',
        pricePerPerson: item.pricePerPerson.toString(),
        minGuests: item.minGuests.toString(),
        maxGuests: item.maxGuests?.toString() || '',
        category: item.category,
        isActive: item.isActive
      } : {
        name: '',
        description: '',
        pricePerPerson: '',
        minGuests: '10',
        maxGuests: '',
        category: 'BUFFET',
        isActive: true
      });
    } else {
      setFormData(item ? {
        name: item.name,
        description: item.description || '',
        price: item.price.toString(),
        category: item.category,
        isVegetarian: item.isVegetarian,
        isVegan: item.isVegan,
        isGlutenFree: item.isGlutenFree,
        isDairyFree: item.isDairyFree,
        isNutFree: item.isNutFree,
        allergens: item.allergens || '',
        isActive: item.isActive
      } : {
        name: '',
        description: '',
        price: '',
        category: 'MAIN',
        isVegetarian: false,
        isVegan: false,
        isGlutenFree: false,
        isDairyFree: false,
        isNutFree: false,
        allergens: '',
        isActive: true
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const endpoint = modalType === 'package' ? '/menus/packages' : '/menus/items';
      if (editing) {
        await api.put(`${endpoint}/${editing.id}`, formData);
      } else {
        await api.post(endpoint, formData);
      }
      setShowModal(false);
      setEditing(null);
      loadData();
    } catch (err) {
      console.error('Failed to save:', err);
      setError(err.response?.data?.error || 'Failed to save. Please try again.');
    }
  };

  const handleDelete = async (type, id) => {
    if (!confirm('Are you sure you want to delete this?')) return;
    try {
      const endpoint = type === 'package' ? '/menus/packages' : '/menus/items';
      await api.delete(`${endpoint}/${id}`);
      loadData();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menus</h1>
          <p className="text-gray-500">Manage menu packages and items</p>
        </div>
        <button
          onClick={() => openModal(activeTab === 'packages' ? 'package' : 'item')}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Add {activeTab === 'packages' ? 'Package' : 'Item'}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('packages')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'packages'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            Menu Packages ({packages.length})
          </button>
          <button
            onClick={() => setActiveTab('items')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'items'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            Menu Items ({items.length})
          </button>
        </nav>
      </div>

      {/* Packages */}
      {activeTab === 'packages' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map((pkg) => (
            <div key={pkg.id} className={`card hover:shadow-md transition-shadow cursor-pointer ${!pkg.isActive && 'opacity-50'}`} onClick={() => setSelectedItem({type: 'package', data: pkg})}>
              <div className="flex items-start justify-between mb-3">
                <span className="badge badge-info">{pkg.category}</span>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => openModal('package', pkg)}
                    className="p-1 text-gray-400 hover:text-indigo-600"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete('package', pkg.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <h3 className="font-semibold text-gray-900 mb-1">{pkg.name}</h3>
              {pkg.description && (
                <p className="text-sm text-gray-500 mb-3">{pkg.description}</p>
              )}

              <div className="flex items-center gap-2 text-lg font-bold text-indigo-600 mb-3">
                <DollarSign size={20} />
                ${pkg.pricePerPerson} per person
              </div>

              <div className="text-sm text-gray-500">
                {pkg.minGuests} - {pkg.maxGuests || 'Unlimited'} guests
              </div>

              {pkg.items?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-sm font-medium text-gray-700 mb-2">Includes:</p>
                  <ul className="text-sm text-gray-500 space-y-1">
                    {pkg.items.slice(0, 4).map((item) => (
                      <li key={item.id}>- {item.menuItem?.name}</li>
                    ))}
                    {pkg.items.length > 4 && (
                      <li className="text-indigo-600">+ {pkg.items.length - 4} more items</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Items */}
      {activeTab === 'items' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.id} className={`card hover:shadow-md transition-shadow cursor-pointer ${!item.isActive && 'opacity-50'}`} onClick={() => setSelectedItem({type: 'item', data: item})}>
              <div className="flex items-start justify-between mb-3">
                <span className="badge badge-gray">{item.category}</span>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => openModal('item', item)}
                    className="p-1 text-gray-400 hover:text-indigo-600"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete('item', item.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <h3 className="font-semibold text-gray-900 mb-1">{item.name}</h3>
              {item.description && (
                <p className="text-sm text-gray-500 mb-3">{item.description}</p>
              )}

              <div className="flex items-center gap-2 text-lg font-bold text-green-600 mb-3">
                ${item.price.toFixed(2)}
              </div>

              <div className="flex flex-wrap gap-1">
                {item.isVegetarian && (
                  <span className="badge badge-success flex items-center gap-1">
                    <Leaf size={12} /> Vegetarian
                  </span>
                )}
                {item.isVegan && (
                  <span className="badge badge-success flex items-center gap-1">
                    <Leaf size={12} /> Vegan
                  </span>
                )}
                {item.isGlutenFree && <span className="badge badge-info">GF</span>}
                {item.isDairyFree && <span className="badge badge-info">DF</span>}
                {item.isNutFree && <span className="badge badge-warning">NF</span>}
              </div>

              {item.allergens && (
                <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
                  <AlertTriangle size={12} />
                  {item.allergens}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editing ? 'Edit' : 'Add'} {modalType === 'package' ? 'Package' : 'Menu Item'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Name</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="label">Description</label>
                  <textarea
                    className="input"
                    rows="2"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                {modalType === 'package' ? (
                  <>
                    <div>
                      <label className="label">Price Per Person</label>
                      <input
                        type="number"
                        className="input"
                        step="0.01"
                        value={formData.pricePerPerson}
                        onChange={(e) => setFormData({...formData, pricePerPerson: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <label className="label">Category</label>
                      <select
                        className="select"
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                      >
                        {packageCategories.map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Min Guests</label>
                      <input
                        type="number"
                        className="input"
                        value={formData.minGuests}
                        onChange={(e) => setFormData({...formData, minGuests: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <label className="label">Max Guests (Optional)</label>
                      <input
                        type="number"
                        className="input"
                        value={formData.maxGuests}
                        onChange={(e) => setFormData({...formData, maxGuests: e.target.value})}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="label">Price</label>
                      <input
                        type="number"
                        className="input"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({...formData, price: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <label className="label">Category</label>
                      <select
                        className="select"
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                      >
                        {categories.map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="label mb-2">Dietary Options</label>
                      <div className="flex flex-wrap gap-4">
                        {[
                          { key: 'isVegetarian', label: 'Vegetarian' },
                          { key: 'isVegan', label: 'Vegan' },
                          { key: 'isGlutenFree', label: 'Gluten Free' },
                          { key: 'isDairyFree', label: 'Dairy Free' },
                          { key: 'isNutFree', label: 'Nut Free' }
                        ].map(opt => (
                          <label key={opt.key} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={formData[opt.key]}
                              onChange={(e) => setFormData({...formData, [opt.key]: e.target.checked})}
                              className="h-4 w-4 text-indigo-600 rounded"
                            />
                            <span className="text-sm">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="label">Allergens</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="e.g., Contains eggs, soy"
                        value={formData.allergens}
                        onChange={(e) => setFormData({...formData, allergens: e.target.value})}
                      />
                    </div>
                  </>
                )}

                <div className="col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                      className="h-4 w-4 text-indigo-600 rounded"
                    />
                    <span className="text-sm">Active</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditing(null); }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {selectedItem && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">{selectedItem.data.name}</h2>
              <span className="badge badge-info mt-2">{selectedItem.data.category}</span>
            </div>
            <div className="p-6 space-y-4">
              {selectedItem.data.description && (
                <p className="text-gray-600">{selectedItem.data.description}</p>
              )}
              <div className="text-2xl font-bold text-indigo-600">
                ${selectedItem.type === 'package' ? `${selectedItem.data.pricePerPerson}/person` : selectedItem.data.price?.toFixed(2)}
              </div>
              {selectedItem.type === 'package' && (
                <div>
                  <p className="text-sm text-gray-500">Guest Range</p>
                  <p className="font-medium">{selectedItem.data.minGuests} - {selectedItem.data.maxGuests || 'Unlimited'} guests</p>
                </div>
              )}
              {selectedItem.type === 'item' && (
                <div className="flex flex-wrap gap-2">
                  {selectedItem.data.isVegetarian && <span className="badge badge-success">Vegetarian</span>}
                  {selectedItem.data.isVegan && <span className="badge badge-success">Vegan</span>}
                  {selectedItem.data.isGlutenFree && <span className="badge badge-info">Gluten-Free</span>}
                  {selectedItem.data.isDairyFree && <span className="badge badge-info">Dairy-Free</span>}
                  {selectedItem.data.isNutFree && <span className="badge badge-warning">Nut-Free</span>}
                </div>
              )}
              {selectedItem.data.allergens && (
                <div className="text-sm text-red-600">Allergens: {selectedItem.data.allergens}</div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setSelectedItem(null)} className="btn btn-secondary">Close</button>
              <button onClick={() => { openModal(selectedItem.type, selectedItem.data); setSelectedItem(null); }} className="btn btn-primary">Edit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
