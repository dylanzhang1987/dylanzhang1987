/**
 * Import Service for Excel/CSV student data import
 */
const XLSX = require('xlsx');
const Papa = require('papaparse');
const Student = require('../models/student.model');
const logger = require('../utils/logger');

class ImportService {
  static async parseFile(file) {
    const ext = file.originalname.split('.').pop().toLowerCase();

    if (ext === 'xlsx' || ext === 'xls') {
      return this.parseExcel(file.buffer);
    } else if (ext === 'csv') {
      return this.parseCSV(file.buffer.toString('utf-8'));
    } else {
      throw new Error('Unsupported file format');
    }
  }

  static parseExcel(buffer) {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (data.length < 2) {
        throw new Error('File is empty or has no data rows');
      }

      // First row is header
      const headers = data[0].map(h => h.toString().trim().toLowerCase().replace(/ /g, '_'));

      // Parse data rows
      const rows = [];
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row.length === 0) continue;

        const rowData = {};
        headers.forEach((header, idx) => {
          rowData[header] = row[idx];
        });
        rows.push(rowData);
      }

      return { headers, rows };
    } catch (error) {
      logger.error('Excel parsing error', error);
      throw new Error('Failed to parse Excel file: ' + error.message);
    }
  }

  static parseCSV(content) {
    return new Promise((resolve, reject) => {
      Papa.parse(content, {
        header: true,
        skipEmptyLines: true,
        transformHeader: header => header.trim().toLowerCase().replace(/ /g, '_'),
        complete: (result) => {
          if (result.data.length === 0) {
            reject(new Error('File is empty or has no data rows'));
            return;
          }
          resolve({
            headers: result.meta.fields,
            rows: result.data
          });
        },
        error: (error) => {
          logger.error('CSV parsing error', error);
          reject(new Error('Failed to parse CSV file: ' + error.message));
        }
      });
    });
  }

  static validateStudentData(row) {
    const errors = [];

    // Required fields
    const requiredFields = ['student_no', 'name'];
    requiredFields.forEach(field => {
      if (!row[field] || row[field].toString().trim() === '') {
        errors.push(`${field} is required`);
      }
    });

    // Validate student_no format
    if (row.student_no && !/^[a-zA-Z0-9_-]+$/.test(row.student_no)) {
      errors.push('student_no must be alphanumeric');
    }

    // Validate phone format if provided
    if (row.phone && !/^[\d\s+-]+$/.test(row.phone)) {
      errors.push('Invalid phone number format');
    }

    // Validate parent_phone if provided
    if (row.parent_phone && !/^[\d\s+-]+$/.test(row.parent_phone)) {
      errors.push('Invalid parent phone number format');
    }

    // Validate date formats
    if (row.birth_date && !this.isValidDate(row.birth_date)) {
      errors.push('Invalid birth_date format');
    }

    if (row.enrollment_date && !this.isValidDate(row.enrollment_date)) {
      errors.push('Invalid enrollment_date format');
    }

    // Validate gender if provided
    if (row.gender && !['male', 'female', 'other'].includes(row.gender.toLowerCase())) {
      errors.push('gender must be male, female, or other');
    }

    return errors;
  }

  static isValidDate(dateStr) {
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  }

  static mapRowToStudent(row) {
    return {
      student_no: row.student_no?.toString().trim(),
      name: row.name?.toString().trim(),
      gender: row.gender?.toString().toLowerCase() || null,
      birth_date: row.birth_date ? new Date(row.birth_date).toISOString().split('T')[0] : null,
      phone: row.phone?.toString().trim() || null,
      parent_name: row.parent_name?.toString().trim() || null,
      parent_phone: row.parent_phone?.toString().trim() || null,
      address: row.address?.toString().trim() || null,
      school: row.school?.toString().trim() || null,
      grade: row.grade?.toString().trim() || null,
      enrollment_date: row.enrollment_date ? new Date(row.enrollment_date).toISOString().split('T')[0] : null,
      notes: row.notes?.toString().trim() || null
    };
  }

  static async importStudents(rows, options = {}) {
    const { skipErrors = false, updateExisting = false } = options;

    const results = {
      success: 0,
      failed: 0,
      errors: [],
      skipped: []
    };

    for (const row of rows) {
      const rowNum = row._rowNum || rows.indexOf(row) + 1;
      const validationErrors = this.validateStudentData(row);

      if (validationErrors.length > 0) {
        results.errors.push({
          row: rowNum,
          student_no: row.student_no,
          errors: validationErrors
        });
        results.failed++;
        if (!skipErrors) continue;
      }

      try {
        const studentData = this.mapRowToStudent(row);

        // Check if student exists
        const existing = await Student.findByStudentNo(studentData.student_no);

        if (existing) {
          if (updateExisting) {
            await Student.update(existing.id, studentData);
            results.success++;
            results.skipped.push({
              row: rowNum,
              student_no: studentData.student_no,
              action: 'updated'
            });
          } else {
            results.skipped.push({
              row: rowNum,
              student_no: studentData.student_no,
              action: 'already_exists'
            });
            results.failed++;
          }
        } else {
          await Student.create(studentData);
          results.success++;
        }
      } catch (error) {
        logger.error('Student import error', error);
        results.errors.push({
          row: rowNum,
          student_no: row.student_no,
          errors: [error.message]
        });
        results.failed++;
        if (!skipErrors) continue;
      }
    }

    return results;
  }

  static async processImport(file, options = {}) {
    // Parse file
    const { headers, rows } = await this.parseFile(file);

    // Validate required columns
    const requiredColumns = ['student_no', 'name'];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    // Import students
    const results = await this.importStudents(rows, options);

    return {
      ...results,
      total: rows.length,
      headers
    };
  }

  static getTemplate() {
    const template = [
      {
        student_no: 'S001',
        name: '张三',
        gender: 'male',
        birth_date: '2010-01-15',
        phone: '13800138000',
        parent_name: '张父',
        parent_phone: '13800138001',
        address: '北京市朝阳区',
        school: '北京市第一小学',
        grade: '三年级',
        enrollment_date: '2024-09-01',
        notes: '备注信息'
      }
    ];

    return template;
  }
}

module.exports = ImportService;
