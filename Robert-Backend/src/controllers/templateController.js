import db from "../config/db.js";
import { ErrorHandler } from "../utils/ErrorHandler.js";
import SuccessHandler from "../utils/SuccessHandler.js";

class TemplateController {
  async getTemplates(req, res, next) {
    try {
      const { category = '', featured = false } = req.query;
      
      let queries = [];
      
      if (category) {
        queries.push(`category="${category}"`);
      }
      
      if (featured === 'true') {
        queries.push('isFeatured=true');
      }

      const templates = await db.TEMPLATES.list(queries);

      return SuccessHandler(
        'Templates fetched successfully', 
        200, 
        res, 
        {
          templates: templates.documents, // Changed from rows to documents
          total: templates.total
        }
      );
    } catch (error) {
      next(error);
    }
  }

  async getTemplateById(req, res, next) {
    try {
      const { id } = req.params;
      
      const template = await db.TEMPLATES.get(id);

      return SuccessHandler(
        'Template fetched successfully', 
        200, 
        res, 
        {
          template: template
        }
      );
    } catch (error) {
      next(new ErrorHandler('Template not found', 404));
    }
  }

  async getCategories(req, res, next) {
    try {
      const templates = await db.TEMPLATES.list();
      
      // Extract unique categories from all templates
      const categories = [...new Set(templates.documents // Changed from rows to documents
        .map(template => template.category)
        .filter(category => category)
      )];

      return SuccessHandler(
        'Categories fetched successfully', 
        200, 
        res, 
        {
          categories: categories
        }
      );
    } catch (error) {
      next(error);
    }
  }

  async searchTemplates(req, res, next) {
    try {
      const { q: searchTerm, category } = req.query;
      
      if (!searchTerm) {
        throw new ErrorHandler('Search term is required', 400);
      }

      let queries = [`name>="${searchTerm}"`];
      
      if (category) {
        queries.push(`category="${category}"`);
      }

      const templates = await db.TEMPLATES.list(queries);

      return SuccessHandler(
        'Search completed', 
        200, 
        res, 
        {
          templates: templates.documents, // Changed from rows to documents
          total: templates.total,
          searchTerm: searchTerm
        }
      );
    } catch (error) {
      next(error);
    }
  }
}

export default new TemplateController();