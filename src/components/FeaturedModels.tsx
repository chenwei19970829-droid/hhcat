import React, { useState, useEffect, useRef } from 'react';
import { FEATURED_MODELS, VillaModel, STORE_INFO } from '../data/catVillaData';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { compressImage } from '../utils/imageCompressor';
import {
  Maximize2,
  Calculator,
  MessageCircle,
  Check,
  Plus,
  Trash2,
  Edit3,
  Upload,
  Lock,
  ChevronDown,
  ChevronUp,
  X,
  AlertCircle
} from 'lucide-react';

const AUTH_STORAGE_KEY = 'hhcat_store_owner_auth_v1';
const VALID_PASSKEYS = ['david19970829'];

const isStoreOwnerLoggedIn = (): boolean => {
  try {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

const useStoreOwner = () => {
  const [isOwner, setIsOwner] = useState<boolean>(() => isStoreOwnerLoggedIn());

  useEffect(() => {
    const handleUpdate = () => {
      setIsOwner(isStoreOwnerLoggedIn());
    };

    window.addEventListener('hhcat_owner_auth_change', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('hhcat_owner_auth_change', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const logout = () => {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      window.dispatchEvent(new Event('hhcat_owner_auth_change'));
    } catch (e) {
      console.warn(e);
    }
  };

  return { isOwner, logout };
};

interface FeaturedModelsProps {
  onSelectForQuote: (model: VillaModel) => void;
  onOpenImageZoom: (imageTitle: string, imageUrl: string, subtitle?: string) => void;
}

const STORAGE_KEY = 'hhcat_featured_custom_models_v2';
const DELETED_MODELS_KEY = 'hhcat_deleted_models_ids_v1';

export const FeaturedModels: React.FC<FeaturedModelsProps> = ({
  onSelectForQuote,
  onOpenImageZoom
}) => {
  const { isOwner, logout } = useStoreOwner();
  const [filter, setFilter] = useState<'all' | '90' | '120' | '150' | '180'>('all');
  const [showAllCards, setShowAllCards] = useState<boolean>(false);
  const [models, setModels] = useState<VillaModel[]>(FEATURED_MODELS);

  useEffect(() => {
    // 訂閱 Firebase 雲端資料庫（開放全權限 list 查詢）
    const unsubscribe = onSnapshot(
      collection(db, 'featuredModels'),
      (snapshot) => {
        const deletedIdsFromCloud = new Set<string>();
        const remoteModels: VillaModel[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.deleted === true) {
            deletedIdsFromCloud.add(data.id || docSnap.id);
          } else if (data.fullModelData) {
            try {
              const model = JSON.parse(data.fullModelData);
              if (model && model.id) {
                remoteModels.push(model);
              }
            } catch (e) {
              console.warn(e);
            }
          } else if (data.id && data.title) {
            remoteModels.push({
              id: data.id,
              name: data.title,
              subtitle: data.tagline || '純實木板厚度足 1.5cm',
              heightGroup: (data.category as any) || '150',
              heightGroupLabel: `高 ${data.category || '150'}cm 系列`,
              dimensions: {
                height: 150,
                depth: 60,
                length: 120,
                dimensionCode: data.dimensions || '150-60-120'
              },
              price: 13800,
              installFee: 4500,
              image: data.imageUrl,
              recommendedCats: '1 - 3 隻貓咪',
              suitableSpace: '客廳主位、寵物房',
              description: `${data.dimensions || '150-60-120'} 客製款式，純實木板足 1.5cm`,
              highlights: data.highlights || ['純實木板厚度足 1.5cm'],
              includedAccessories: data.features || ['高透耐磨安全壓克力門'],
              isCustomUpload: true
            });
          }
        });

        setModels(() => {
          const activeDefaults = FEATURED_MODELS.filter(
            (orig) => !deletedIdsFromCloud.has(orig.id) && !remoteModels.some((r) => r.id === orig.id)
          );
          const activeRemotes = remoteModels.filter((r) => !deletedIdsFromCloud.has(r.id));
          return [...activeRemotes, ...activeDefaults];
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'featuredModels');
      }
    );

    return () => unsubscribe();
  }, []);

  const handleDeleteModel = async (model: VillaModel, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOwner) return;

    if (window.confirm(`確定要刪除款式【${model.name}】嗎？`)) {
      const updated = models.filter((m) => m.id !== model.id);
      setModels(updated);

      try {
        await setDoc(doc(db, 'featuredModels', model.id), {
          id: model.id,
          deleted: true,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `featuredModels/${model.id}`);
      }
    }
  };

  const filteredModels = models.filter((model) => {
    if (filter === 'all') return true;
    return model.heightGroup === filter;
  });

  const displayedModels = filter === 'all' && !showAllCards ? filteredModels.slice(0, 6) : filteredModels;

  return (
    <section id="models" className="py-16 sm:py-20 border-b border-stone-200 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-amber-800">
              Handcrafted Cat Villas · A-Z 款式目錄
            </div>
            <h2 className="font-serif-title text-2xl sm:text-3xl font-bold text-stone-900 mt-1">
              精選貓別墅款式
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {displayedModels.map((model) => (
            <div
              key={model.id}
              className="bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-lg transition-all flex flex-col group relative"
            >
              <div className="relative aspect-4/3 bg-[#F6F2EC] p-2 flex items-center justify-center">
                <img
                  src={model.image}
                  alt={model.name}
                  className="w-full h-full object-contain"
                />
                {isOwner && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteModel(model, e)}
                    className="absolute bottom-3 right-3 px-2.5 py-1 bg-red-600 text-white text-[11px] font-semibold rounded-lg shadow-sm flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>刪除</span>
                  </button>
                )}
              </div>

              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="font-serif-title font-bold text-stone-900 text-lg">
                    {model.name}
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">{model.subtitle}</p>
                </div>

                <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
                  <div className="text-xl font-bold text-amber-900 font-mono">
                    NT$ {model.price.toLocaleString()}
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectForQuote(model)}
                    className="py-2 px-3 text-xs font-semibold text-stone-800 bg-stone-100 rounded-lg"
                  >
                    帶入試算
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
