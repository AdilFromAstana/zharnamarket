import { Dispatch, SetStateAction, useState, useEffect } from "react";
import { Form, Input, Select, Upload, Spin } from "antd";
import {
  CameraOutlined,
  YoutubeOutlined,
  PlaySquareOutlined,
} from "@ant-design/icons";
import type { FormInstance } from "antd";
import { toast } from "sonner";
import {
  getCities,
  getCategories,
  getPlatforms,
  type RefItem,
} from "@/lib/constants";
import RichTextEditor from "@/components/ui/RichTextEditor";
import type { FormValues, CategoryOption } from "../_types";
import { PLATFORM_ICONS } from "../_constants";

type Step1FormProps = {
  form: FormInstance<FormValues>;
  values: FormValues;
  adImages: string[];
  imageUploading: boolean;
  videoFormats: CategoryOption[];
  adFormats: CategoryOption[];
  adSubjects: CategoryOption[];
  saveDraft: (v: Partial<FormValues>) => void;
  setValues: Dispatch<SetStateAction<FormValues>>;
  setAdImages: Dispatch<SetStateAction<string[]>>;
  setImageUploading: Dispatch<SetStateAction<boolean>>;
};

export default function Step1Form({
  form,
  values,
  adImages,
  imageUploading,
  videoFormats,
  adFormats,
  adSubjects,
  saveDraft,
  setValues,
  setAdImages,
  setImageUploading,
}: Step1FormProps) {
  const [cities, setCities] = useState<RefItem[]>([]);
  const [categories, setCategories] = useState<RefItem[]>([]);
  const [platforms, setPlatforms] = useState<RefItem[]>([]);

  // Загружаем справочные данные
  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        const [citiesData, categoriesData, platformsData] = await Promise.all([
          getCities(),
          getCategories(),
          getPlatforms(),
        ]);
        setCities(citiesData);
        setCategories(categoriesData);
        setPlatforms(platformsData);
      } catch (error) {
        console.error("Error loading reference data:", error);
      }
    };

    loadReferenceData();
  }, []);
  return (
    <>
      {/* Основная информация */}
      <div className="md:bg-white md:rounded-xl md:border md:border-gray-200 md:shadow-sm md:p-6">
        <Form.Item
          label="Название объявления"
          name="title"
          rules={[
            { required: true, message: "Введите название" },
            { min: 10, message: "Минимум 10 символов" },
          ]}
        >
          <Input placeholder="Например: Нужен TikTok-блогер для обзора нашего кафе" />
        </Form.Item>

        {/* Платформа — чипы с иконками */}
        <Form.Item
          label="Платформа"
          name="platform"
          rules={[{ required: true, message: "Выберите платформу" }]}
        >
          <div className="flex gap-3 flex-wrap">
            {platforms.map((p) => {
              const selected = values.platform === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => {
                    form.setFieldValue("platform", p.key);
                    saveDraft({ platform: p.key });
                    setValues((v) => ({ ...v, platform: p.key }));
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full border-2 text-sm font-medium transition-all cursor-pointer min-h-[44px] ${
                    selected
                      ? "border-blue-500 bg-blue-50 text-blue-600"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <span className="text-base leading-none">
                    {PLATFORM_ICONS[p.key]}
                  </span>
                  {p.label}
                </button>
              );
            })}
          </div>
        </Form.Item>

        <div className="grid grid-cols-2 gap-4">
          <Form.Item
            label="Город"
            name="city"
            rules={[{ required: true, message: "Выберите город" }]}
          >
            <Select
              placeholder="Выберите город"
              options={cities.map((c) => ({
                label: c.label,
                value: c.key,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="Категория"
            name="category"
            rules={[{ required: true, message: "Выберите категорию" }]}
          >
            <Select
              placeholder="Категория"
              options={categories.map((c) => ({
                label: c.label,
                value: c.key,
              }))}
            />
          </Form.Item>
        </div>

        {/* Категорийные измерения */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-4">
          <Form.Item label="Формат видео" name="videoFormatId">
            <Select
              placeholder="Выберите формат"
              allowClear
              options={videoFormats.map((vf) => ({
                label: `${vf.icon ?? ""} ${vf.label}`.trim(),
                value: vf.id,
              }))}
            />
          </Form.Item>
          <Form.Item label="Формат рекламы" name="adFormatId">
            <Select
              placeholder="Выберите формат"
              allowClear
              options={adFormats.map((af) => ({
                label: `${af.icon ?? ""} ${af.label}`.trim(),
                value: af.id,
              }))}
            />
          </Form.Item>
          <Form.Item label="Что рекламируется" name="adSubjectId">
            <Select
              placeholder="Выберите тип"
              allowClear
              options={adSubjects.map((as_) => ({
                label: `${as_.icon ?? ""} ${as_.label}`.trim(),
                value: as_.id,
              }))}
            />
          </Form.Item>
        </div>

        <Form.Item
          label="Описание задания"
          name="description"
          rules={[{ required: true, message: "Опишите задание" }]}
          extra={
            <div className="mt-2 p-3 bg-blue-50 rounded-lg text-xs text-blue-700 space-y-0.5">
              <p className="font-medium mb-1">Совет: укажите</p>
              <p>• Продукт / услугу, которую нужно показать</p>
              <p>
                • Формат видео (обзор, анбоксинг, повседневное использование…)
              </p>
              <p>• Обязательные элементы (лого, ссылка, хэштег)</p>
              <p>• Что нельзя делать</p>
            </div>
          }
        >
          <RichTextEditor placeholder="Опишите задание подробно: что нужно сделать, какие требования к видео, основные правила..." />
        </Form.Item>
      </div>

      {/* Фото к объявлению */}
      <div className="md:bg-white md:rounded-xl md:border md:border-gray-200 md:shadow-sm md:p-6">
        <h3 className="font-semibold text-gray-900 mb-3 text-base">
          Фотографии{" "}
          <span className="text-gray-400 font-normal text-sm">
            (необязательно)
          </span>
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Добавьте фото продукта, примеры видео или референсы. До 5 фото,
          JPG/PNG/WebP до 10 МБ.
        </p>
        <div className="flex flex-wrap gap-3">
          {adImages.map((url, idx) => (
            <div
              key={idx}
              className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Фото ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() =>
                  setAdImages((prev) => prev.filter((_, i) => i !== idx))
                }
              >
                &times;
              </button>
            </div>
          ))}
          {adImages.length < 5 && (
            <Upload
              accept="image/jpeg,image/png,image/webp"
              showUploadList={false}
              disabled={imageUploading}
              beforeUpload={async (file: File) => {
                setImageUploading(true);
                try {
                  const fd = new FormData();
                  fd.append("file", file);
                  fd.append("type", "ad");
                  const res = await fetch("/api/upload", {
                    method: "POST",
                    credentials: "include",
                    body: fd,
                  });
                  if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    toast.error(err.error ?? "Ошибка загрузки");
                    return false;
                  }
                  const { url } = await res.json();
                  setAdImages((prev) => [...prev, url]);
                } catch {
                  toast.error("Ошибка загрузки фото");
                } finally {
                  setImageUploading(false);
                }
                return false;
              }}
            >
              <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-sky-400 transition-colors">
                {imageUploading ? (
                  <Spin size="small" />
                ) : (
                  <>
                    <CameraOutlined className="text-gray-400 text-lg" />
                    <span className="text-xs text-gray-400 mt-1">Фото</span>
                  </>
                )}
              </div>
            </Upload>
          )}
        </div>
      </div>
    </>
  );
}
