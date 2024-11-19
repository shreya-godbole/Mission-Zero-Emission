// Import necessary modules
import { expect } from 'chai';
import ini from 'ini';
import fs from 'fs';
import path from 'path';

// Describe the test suite
describe('Config Parsing', function() {
    let config;

    // Load the config file before running tests
    before(function() {
        const configFilePath = path.join(process.cwd(), 'config.ini'); // Adjust the path as needed
        const configFileContent = fs.readFileSync(configFilePath, 'utf-8');
        config = ini.parse(configFileContent);
    });

    // Test to verify that config.ini is loaded correctly
    it('should correctly parse the database.db_path', function() {
        expect(config).to.have.nested.property('database.db_path').that.is.a('string').and.is.not.empty;
    });

    it('should correctly parse the settings.joularjx_path', function() {
        expect(config).to.have.nested.property('settings.joularjx_path').that.is.a('string').and.is.not.empty;
    });

    it('should correctly parse the settings.java_path', function() {
        expect(config).to.have.nested.property('settings.java_path').that.is.a('string').and.is.not.empty;
    });
});
