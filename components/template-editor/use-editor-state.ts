"use client"

import { useReducer, useCallback } from 'react'
import { EditorState, EditorAction, TemplateSlide, TemplateLayer, AspectRatio } from './types'
import { ASPECT_RATIOS } from './constants'

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_TEMPLATE':
      return { ...state, template: action.template }

    case 'SET_SLIDES':
      return { ...state, slides: action.slides }

    case 'SET_LAYERS':
      return {
        ...state,
        layers: { ...state.layers, [action.slideId]: action.layers }
      }

    case 'ADD_SLIDE': {
      const slideId = action.slide.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2))
      const slideWithId = { ...action.slide, id: slideId }
      const newSlides = [...state.slides, slideWithId]
      return { ...state, slides: newSlides, selectedSlideId: slideId, isDirty: true }
    }

    case 'DELETE_SLIDE': {
      const newSlides = state.slides.filter(s => s.id !== action.slideId)
      const newLayers = { ...state.layers }
      delete newLayers[action.slideId]
      
      // Reorder remaining slides
      const reorderedSlides = newSlides.map((slide, idx) => ({
        ...slide,
        position: idx
      }))
      
      const nextSlideId = reorderedSlides[0]?.id || null
      
      return {
        ...state,
        slides: reorderedSlides,
        layers: newLayers,
        selectedSlideId: nextSlideId,
        selectedLayerId: null,
        isDirty: true
      }
    }

    case 'DUPLICATE_SLIDE': {
      const slideToDuplicate = state.slides.find(s => s.id === action.slideId)
      if (!slideToDuplicate) return state

      const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)
      const newPosition = Math.max(...state.slides.map(s => s.position)) + 1
      const newSlide: TemplateSlide = {
        ...slideToDuplicate,
        id: newId,
        position: newPosition
      }

      const newSlides = [...state.slides, newSlide]
      const slideLayers = state.layers[action.slideId] || []
      const duplicatedLayers = slideLayers.map(layer => ({
        ...layer,
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
        slide_id: newId
      }))

      return {
        ...state,
        slides: newSlides,
        layers: {
          ...state.layers,
          [newId]: duplicatedLayers
        },
        selectedSlideId: newId,
        isDirty: true
      }
    }

    case 'UPDATE_SLIDE': {
      const updatedSlides = state.slides.map(slide =>
        slide.id === action.slideId ? { ...slide, ...action.updates } : slide
      )
      return { ...state, slides: updatedSlides, isDirty: true }
    }

    case 'REORDER_SLIDES': {
      const reorderedSlides = action.slideIds.map((id, idx) => {
        const slide = state.slides.find(s => s.id === id)
        return slide ? { ...slide, position: idx } : null
      }).filter(Boolean) as TemplateSlide[]
      
      return { ...state, slides: reorderedSlides, isDirty: true }
    }

    case 'ADD_LAYER': {
      const slideLayers = state.layers[action.slideId] || []
      const layerId = action.layer.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2))
      const layerWithId = { 
        ...action.layer, 
        id: layerId, 
        slide_id: action.slideId,
        height: action.layer.height || action.layer.width // Default height to width if not provided
      }
      const newLayers = [...slideLayers, layerWithId]
      return {
        ...state,
        layers: { ...state.layers, [action.slideId]: newLayers },
        selectedLayerId: layerId,
        isDirty: true
      }
    }

    case 'UPDATE_LAYER': {
      const updatedLayers: Record<string, TemplateLayer[]> = {}
      for (const [slideId, layers] of Object.entries(state.layers)) {
        updatedLayers[slideId] = layers.map(layer =>
          layer.id === action.layerId ? { ...layer, ...action.updates } : layer
        )
      }
      return { ...state, layers: updatedLayers, isDirty: true }
    }

    case 'DELETE_LAYER': {
      const updatedLayers: Record<string, TemplateLayer[]> = {}
      for (const [slideId, layers] of Object.entries(state.layers)) {
        updatedLayers[slideId] = layers.filter(l => l.id !== action.layerId)
      }
      return {
        ...state,
        layers: updatedLayers,
        selectedLayerId: null,
        isDirty: true
      }
    }

    case 'REORDER_LAYERS': {
      const slideLayers = state.layers[action.slideId] || []
      const reorderedLayers = action.layerIds.map((id, idx) => {
        const layer = slideLayers.find(l => l.id === id)
        return layer ? { ...layer, position: idx } : null
      }).filter(Boolean) as TemplateLayer[]
      
      return {
        ...state,
        layers: { ...state.layers, [action.slideId]: reorderedLayers },
        isDirty: true
      }
    }

    case 'SELECT_SLIDE':
      return { ...state, selectedSlideId: action.slideId, selectedLayerId: null }

    case 'SELECT_LAYER':
      return { ...state, selectedLayerId: action.layerId }

    case 'SET_DIRTY':
      return { ...state, isDirty: action.isDirty }

    case 'SET_ASPECT_RATIO':
      return {
        ...state,
        template: {
          ...state.template,
          aspect_ratio: action.aspectRatio,
          width: action.width,
          height: action.height
        },
        isDirty: true
      }

    case 'SET_ZOOM':
      return { ...state, zoom: action.zoom }

    case 'RESET':
      return {
        template: action.template || {
          name: 'New Template',
          type: 'carousel',
          aspect_ratio: '9:16',
          width: 1080,
          height: 1920
        },
        slides: [],
        layers: {},
        selectedSlideId: null,
        selectedLayerId: null,
        isDirty: false,
        zoom: 1.0
      }

    default:
      return state
  }
}

export function useEditorState(initialTemplate?: any) {
  const initialState: EditorState = {
    template: initialTemplate || {
      name: 'New Template',
      type: 'carousel',
      aspect_ratio: '9:16',
      width: 1080,
      height: 1920
    },
    slides: [],
    layers: {},
    selectedSlideId: null,
    selectedLayerId: null,
    isDirty: false,
    zoom: 1.0
  }

  const [state, dispatch] = useReducer(editorReducer, initialState)

  const addSlide = useCallback((slide: TemplateSlide) => {
    dispatch({ type: 'ADD_SLIDE', slide })
  }, [])

  const deleteSlide = useCallback((slideId: string) => {
    dispatch({ type: 'DELETE_SLIDE', slideId })
  }, [])

  const duplicateSlide = useCallback((slideId: string) => {
    dispatch({ type: 'DUPLICATE_SLIDE', slideId })
  }, [])

  const updateSlide = useCallback((slideId: string, updates: Partial<TemplateSlide>) => {
    dispatch({ type: 'UPDATE_SLIDE', slideId, updates })
  }, [])

  const addLayer = useCallback((slideId: string, layer: TemplateLayer) => {
    dispatch({ type: 'ADD_LAYER', slideId, layer })
  }, [])

  const updateLayer = useCallback((layerId: string, updates: Partial<TemplateLayer>) => {
    dispatch({ type: 'UPDATE_LAYER', layerId, updates })
  }, [])

  const deleteLayer = useCallback((layerId: string) => {
    dispatch({ type: 'DELETE_LAYER', layerId })
  }, [])

  const setAspectRatio = useCallback((aspectRatio: AspectRatio) => {
    const { width, height } = ASPECT_RATIOS[aspectRatio]
    dispatch({ type: 'SET_ASPECT_RATIO', aspectRatio, width, height })
  }, [])

  return {
    state,
    dispatch,
    addSlide,
    deleteSlide,
    duplicateSlide,
    updateSlide,
    addLayer,
    updateLayer,
    deleteLayer,
    setAspectRatio
  }
}
