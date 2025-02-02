import { supabase } from './supabase';

interface Template {
  id?: string;
  name: string;
  canvas_data: any;
  is_active: boolean;
}

class TemplateService {
  async loadTemplates(): Promise<Template[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to load templates:', error);
      throw error;
    }
  }

  async saveTemplate(template: Template): Promise<Template> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const templateData = {
        name: template.name,
        canvas_data: template.canvas_data,
        is_active: template.is_active,
        user_id: user.id
      };

      const { data, error } = template.id
        ? await supabase
            .from('templates')
            .update(templateData)
            .eq('id', template.id)
            .select()
            .single()
        : await supabase
            .from('templates')
            .insert([templateData])
            .select()
            .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to save template');
      
      return data;
    } catch (error) {
      console.error('Failed to save template:', error);
      throw error;
    }
  }

  async deleteTemplate(templateId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to delete template:', error);
      throw error;
    }
  }

  async getActiveTemplate(): Promise<Template | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Failed to get active template:', error);
      throw error;
    }
  }
}

export const templateService = new TemplateService();